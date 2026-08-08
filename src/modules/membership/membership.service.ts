import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PayOS, type Webhook } from '@payos/node';
import dayjs from 'dayjs';
import { PrismaService } from '../../prisma.service';
import { ErrorCode } from '../../common/constants/error-code.constant';
import {
  MembershipPlan,
  MembershipTransactionStatus,
} from '../../generated/prisma/client';
import payosConfig from '../../config/payos.config';
import { ACTIVE_LISTING_STATUSES } from '../../common/constants/listing-limit.constant';

// Stable key for the always-free tier — every seller who never purchased, or
// whose paid plan lapsed, resolves to this plan. It lives in the same table
// as the paid tiers (not a hardcoded constant) so its limits stay configurable.
const FREE_PLAN_KEY = 'FREE';

@Injectable()
export class MembershipService {
  private readonly payOS: PayOS;
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(payosConfig.KEY)
    private readonly config: ConfigType<typeof payosConfig>,
  ) {
    this.payOS = new PayOS({
      clientId: this.config.clientId,
      apiKey: this.config.apiKey,
      checksumKey: this.config.checksumKey,
    });
  }

  async getPlans() {
    return this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // The single source of truth for "which plan's limits apply to this user
  // right now" — a lapsed paid plan silently falls back to Free instead of
  // requiring a cron job to reset membershipPlanId. Callers needing seller
  // limits (Products module: active-listing cap, image count, listing
  // duration) should always go through this, never read User.membershipPlanId directly.
  async getEffectivePlan(userId: number): Promise<MembershipPlan> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { membershipPlan: true, membershipExpiresAt: true },
    });

    const hasActivePaidPlan =
      !!user?.membershipPlan &&
      !!user.membershipExpiresAt &&
      user.membershipExpiresAt > new Date();

    if (hasActivePaidPlan) {
      return user.membershipPlan!;
    }

    return this.prisma.membershipPlan.findUniqueOrThrow({
      where: { key: FREE_PLAN_KEY },
    });
  }

  // Powers the "current plan" status card on /goi-thanh-vien — plan +
  // expiry + how much of the plan is actually in use right now.
  async getMyMembership(userId: number) {
    const [plan, user, activeListingsCount] = await Promise.all([
      this.getEffectivePlan(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { membershipExpiresAt: true },
      }),
      this.prisma.product.count({
        where: { sellerId: userId, status: { in: ACTIVE_LISTING_STATUSES } },
      }),
    ]);

    return {
      plan,
      expiresAt: user?.membershipExpiresAt ?? null,
      activeListingsCount,
    };
  }

  // Creates a PayOS payment link for a paid plan and a PENDING transaction
  // row to reconcile the webhook against. Free is never purchasable — it's
  // what a seller already has by default.
  async purchase(userId: number, planKey: string) {
    // 1. Resolve the plan being bought
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { key: planKey },
    });
    if (!plan || !plan.isActive) {
      throw new BadRequestException({
        message: 'Gói thành viên không tồn tại hoặc đã ngừng bán',
        errorCode: ErrorCode.MEMBERSHIP_PLAN_NOT_FOUND,
      });
    }
    if (plan.key === FREE_PLAN_KEY) {
      throw new BadRequestException({
        message: 'Không thể mua gói Miễn phí',
        errorCode: ErrorCode.MEMBERSHIP_PLAN_NOT_PURCHASABLE,
      });
    }

    // 2. PayOS orderCode must be a unique number — a timestamp is unique
    //    enough at this scale and needs no extra DB round trip to generate.
    const orderCode = Date.now();

    // 3. Record the attempt before calling PayOS, so the webhook always has
    //    a row to reconcile against.
    const transaction = await this.prisma.membershipTransaction.create({
      data: {
        userId,
        planId: plan.id,
        amount: plan.price,
        payosOrderCode: String(orderCode),
        status: MembershipTransactionStatus.PENDING,
      },
    });

    // 4. Ask PayOS for the checkout link. Roll back the transaction row on
    //    failure so a dead PayOS call doesn't leave PENDING garbage behind.
    try {
      const paymentLink = await this.payOS.paymentRequests.create({
        orderCode,
        amount: Number(plan.price),
        description: `Fleazo - Goi ${plan.name}`,
        returnUrl: `${process.env.FRONTEND_URL}/goi-thanh-vien?membership=success`,
        cancelUrl: `${process.env.FRONTEND_URL}/goi-thanh-vien?membership=cancelled`,
      });

      return {
        checkoutUrl: paymentLink.checkoutUrl,
        transactionId: transaction.id,
      };
    } catch (error) {
      await this.prisma.membershipTransaction.delete({
        where: { id: transaction.id },
      });
      this.logger.error('Failed to create PayOS payment link', error as Error);
      throw new BadRequestException(
        'Không thể tạo yêu cầu thanh toán, vui lòng thử lại',
      );
    }
  }

  // PayOS calls this for every payment event. Verifies the signature itself
  // (payos.webhooks.verify throws WebhookError on a bad/forged signature),
  // so no manual HMAC code lives here.
  async handleWebhook(webhook: Webhook) {
    let data: Awaited<ReturnType<PayOS['webhooks']['verify']>>;
    try {
      data = await this.payOS.webhooks.verify(webhook);
    } catch (error) {
      this.logger.warn(`Rejected PayOS webhook: ${(error as Error).message}`);
      return { success: false };
    }

    const transaction = await this.prisma.membershipTransaction.findUnique({
      where: { payosOrderCode: String(data.orderCode) },
      include: { plan: true },
    });
    if (!transaction) {
      this.logger.warn(`No transaction found for orderCode ${data.orderCode}`);
      return { success: false };
    }

    // Already processed (PayOS may retry the same webhook) — no-op.
    if (transaction.status !== MembershipTransactionStatus.PENDING) {
      return { success: true };
    }

    // "00" is PayOS's own code for "payment succeeded" — everything else is a failure.
    const isSuccess = data.code === '00';

    await this.prisma.membershipTransaction.update({
      where: { id: transaction.id },
      data: {
        status: isSuccess
          ? MembershipTransactionStatus.SUCCESS
          : MembershipTransactionStatus.FAILED,
      },
    });

    if (isSuccess) {
      // Resets the clock to now + plan.durationDays rather than stacking
      // remaining time — buying early doesn't reward the seller with extra
      // days, it just switches/renews the plan starting today.
      await this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          membershipPlanId: transaction.planId,
          membershipExpiresAt: dayjs()
            .add(transaction.plan.durationDays, 'day')
            .toDate(),
        },
      });
      this.logger.log(
        `User ${transaction.userId} upgraded to plan ${transaction.plan.key}`,
      );
    }

    return { success: isSuccess };
  }
}

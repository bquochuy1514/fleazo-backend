import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { Webhook } from '@payos/node';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { PurchaseMembershipDto } from './dto/purchase-membership.dto';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('plans')
  getPlans() {
    return this.membershipService.getPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyMembership(@CurrentUser() user: JwtPayload) {
    return this.membershipService.getMyMembership(user.id);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  purchase(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PurchaseMembershipDto,
  ) {
    return this.membershipService.purchase(user.id, dto.planKey);
  }

  // Public — called by PayOS's own servers, not the frontend. No JwtAuthGuard;
  // the payload's signature (verified inside handleWebhook) is what proves it's real.
  @Post('webhook')
  handleWebhook(@Body() body: Webhook) {
    return this.membershipService.handleWebhook(body);
  }
}

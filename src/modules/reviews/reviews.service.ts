import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ErrorCode } from '../../common/constants/error-code.constant';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Eligibility gate: the pair must have exchanged at least one real
  // message. A recalled message still counts — recall only hides content
  // for display, the fact that contact happened is still true. Not gated
  // on any product — a review rates the seller, not a specific listing.
  async assertCanReview(reviewerId: number, sellerId: number): Promise<void> {
    if (reviewerId === sellerId) {
      throw new BadRequestException({
        message: 'Bạn không thể tự đánh giá chính mình',
        errorCode: ErrorCode.CANNOT_REVIEW_SELF,
      });
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { initiatorId: reviewerId, recipientId: sellerId },
          { initiatorId: sellerId, recipientId: reviewerId },
        ],
      },
    });

    const hasMessaged =
      !!conversation &&
      (await this.prisma.message.count({
        where: { conversationId: conversation.id },
      })) > 0;

    if (!hasMessaged) {
      throw new BadRequestException({
        message: 'Bạn cần nhắn tin với người bán này trước khi đánh giá',
        errorCode: ErrorCode.NOT_ELIGIBLE_TO_REVIEW,
      });
    }
  }

  async upsertReview(reviewerId: number, dto: CreateReviewDto) {
    // 1. Gate check
    await this.assertCanReview(reviewerId, dto.sellerId);

    // 2. One review per (reviewer, seller) pair, ever — reviewing again
    // (e.g. a repeat purchase) overwrites the existing row instead of
    // creating a new one.
    return this.prisma.review.upsert({
      where: {
        reviewerId_sellerId: { reviewerId, sellerId: dto.sellerId },
      },
      create: {
        reviewerId,
        sellerId: dto.sellerId,
        rating: dto.rating,
        comment: dto.comment,
      },
      update: {
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async getSellerReviews(sellerId: number, query: QueryReviewsDto) {
    const { page = 1, limit = 20 } = query;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reviewer: { select: { id: true, fullName: true, avatar: true } },
        },
      }),
      this.prisma.review.count({ where: { sellerId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReviewerReviews(reviewerId: number, query: QueryReviewsDto) {
    const { page = 1, limit = 20 } = query;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { reviewerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: { select: { id: true, fullName: true, avatar: true } },
        },
      }),
      this.prisma.review.count({ where: { reviewerId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Computed live from the reviews table on every call — not cached on
  // User.avgRating. At Fleazo's actual scale a live AVG is fast enough, and
  // this avoids a second source of truth that could drift out of sync.
  async getSellerRatingSummary(sellerId: number) {
    const result = await this.prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: true,
    });

    return {
      avgRating: result._avg.rating ?? 0,
      reviewCount: result._count,
    };
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createOrUpdateReview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.upsertReview(user.id, dto);
  }

  @Get('seller/:sellerId')
  getSellerReviews(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.getSellerReviews(sellerId, query);
  }

  @Get('me/given')
  @UseGuards(JwtAuthGuard)
  getMyGivenReviews(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.getReviewerReviews(user.id, query);
  }
}

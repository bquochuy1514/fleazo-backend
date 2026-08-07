import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../../prisma.service';
import { UploadModule } from '../upload/upload.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [UploadModule, ReviewsModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}

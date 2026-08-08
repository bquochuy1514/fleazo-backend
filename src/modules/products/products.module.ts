import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { UploadService } from '../upload/upload.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesModule } from '../categories/categories.module';
import { MembershipModule } from '../membership/membership.module';
import fleazoAiConfig from '../../config/fleazo-ai.config';

@Module({
  imports: [
    CategoriesModule,
    MembershipModule,
    HttpModule,
    ConfigModule.forFeature(fleazoAiConfig),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService, UploadService],
  exports: [ProductsService],
})
export class ProductsModule {}

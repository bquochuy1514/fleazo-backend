import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UploadService } from '../upload/upload.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService, UploadService],
  exports: [ProductsService],
})
export class ProductsModule {}

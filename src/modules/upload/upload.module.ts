// src/modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { CloudinaryProvider } from './cloudinary.provider';
import cloudinaryConfig from '../../config/cloudinary.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forFeature(cloudinaryConfig)],
  providers: [UploadService, CloudinaryProvider],
  exports: [UploadService],
})
export class UploadModule {}

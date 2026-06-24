// src/modules/upload/cloudinary.provider.ts
import { v2 as cloudinary } from 'cloudinary';
import type { ConfigType } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
import cloudinaryConfig from '../../config/cloudinary.config';

export const CLOUDINARY = 'CLOUDINARY';

@Injectable()
export class CloudinaryProvider {
  constructor(
    @Inject(cloudinaryConfig.KEY)
    private config: ConfigType<typeof cloudinaryConfig>,
  ) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
  }
}

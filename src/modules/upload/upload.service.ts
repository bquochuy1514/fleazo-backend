import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadService {
  async uploadImage(file: MulterFile, folder: string): Promise<string> {
    if (!file) throw new BadRequestException('No file provided');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `fleazo/${folder}`,
          transformation: [{ width: 500, height: 500, crop: 'fill' }],
        },
        (error, result) => {
          if (error) reject(new BadRequestException(error.message));
          else if (!result) reject(new BadRequestException('Upload failed'));
          else resolve(result.secure_url);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}

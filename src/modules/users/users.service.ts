/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async updateUser(id: number, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async handleGetProfile(user: JwtPayload) {
    // 1. Find user by id
    const foundUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!foundUser) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    // 2. Strip sensitive fields
    const {
      password,
      hashedRefreshToken,
      codeOtp,
      codeOtpExpiration,
      isOtpVerified,
      ...safeUser
    } = foundUser;

    return safeUser;
  }

  async handleUpdateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ) {
    // 1. Check user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    // 2. Update profile
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });

    // 3. Strip sensitive fields
    const {
      password,
      hashedRefreshToken,
      codeOtp,
      codeOtpExpiration,
      isOtpVerified,
      ...safeUser
    } = updated;

    return safeUser;
  }

  // users.service.ts
  async handleUpdateAvatar(userId: number, file: Express.Multer.File) {
    // 1. Upload to Cloudinary
    const result = await this.uploadService.uploadImage(file, 'fleazo/avatars');

    // 2. Update user avatar URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: result.secure_url },
    });

    // 3. Return new avatar URL
    return { avatar: result.secure_url };
  }
}

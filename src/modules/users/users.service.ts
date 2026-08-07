/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadService } from '../upload/upload.service';
import * as argon2 from 'argon2';
import { ChangePasswordDto } from './dto/change-password.dto';
import { comparePassword } from '../../common/utils/hash.util';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
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
    // 1. Find user by id — include university (id/name only) so the
    // frontend can show/filter by school name without a second lookup.
    const foundUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { university: { select: { id: true, name: true } } },
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

    return { ...safeUser, hasPassword: !!password };
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

    // 2. Validate paired location fields — code and name must travel together
    const { provinceCode, provinceName, wardCode, wardName } = updateProfileDto;
    const provincePairBroken =
      (provinceCode !== undefined) !== (provinceName !== undefined);
    const wardPairBroken =
      (wardCode !== undefined) !== (wardName !== undefined);
    if (provincePairBroken || wardPairBroken) {
      throw new BadRequestException(
        'Vui lòng cung cấp đầy đủ mã và tên của tỉnh/thành phố hoặc phường/xã.',
      );
    }

    // 3. Update profile
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });

    // 4. Strip sensitive fields
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

  async handleUpdateAvatar(userId: number, file: Express.Multer.File) {
    // 1. Get current avatar URL
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng.');
    }

    // 2. Delete old avatar from Cloudinary (skip if default)
    const defaultAvatar =
      'https://res.cloudinary.com/dazcuspid/image/upload/default_avatar_nj9oa5.avif';
    if (user.avatar && user.avatar !== defaultAvatar) {
      // Extracts the Cloudinary public_id (e.g. "fleazo/avatars/abc") from the URL
      const afterUpload = user.avatar.split('/upload/')[1];
      const withoutVersion = afterUpload.replace(/^v\d+\//, '');
      const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
      await this.uploadService.deleteImage(publicId);
    }

    // 3. Upload new avatar
    const result = await this.uploadService.uploadImage(file, 'fleazo/avatars');

    // 4. Update user avatar URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: result.secure_url },
    });

    // 5. Return new avatar URL
    return { avatar: result.secure_url };
  }

  async handleChangePassword(userId: number, dto: ChangePasswordDto) {
    // 1. Find user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    // 2. Block OAuth-only users (no password set)
    if (!user.password) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng Google không thể đổi mật khẩu theo cách này.',
      );
    }

    // 3. Verify current password
    const isMatch = await comparePassword(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }

    // 4. Hash new password
    const hashed = await argon2.hash(dto.newPassword);

    // 5. Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Đổi mật khẩu thành công.' };
  }

  async handleGetPublicProfile(targetUserId: number) {
    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    // 2. Rating summary computed live from the reviews table (see
    // ReviewsService.getSellerRatingSummary) — no denormalized/cached field.
    const { avgRating, reviewCount } =
      await this.reviewsService.getSellerRatingSummary(targetUserId);

    // 3. Return only public fields — provinceName/wardName shown for rough
    // location context, addressDetail and codes withheld (street-level = home address)
    return {
      id: user.id,
      fullName: user.fullName,
      avatar: user.avatar,
      provinceName: user.provinceName,
      wardName: user.wardName,
      createdAt: user.createdAt,
      avgRating,
      reviewCount,
    };
  }

  async handleAdminGetAllUsers() {
    // 1. Fetch all users
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 2. Strip sensitive fields from each user
    return users.map(
      ({
        password,
        hashedRefreshToken,
        codeOtp,
        codeOtpExpiration,
        isOtpVerified,
        ...safe
      }) => safe,
    );
  }

  async handleAdminUpdateUser(targetId: number, dto: AdminUpdateUserDto) {
    // 1. Check user exists
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    // 2. Apply update
    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: dto,
    });

    // 3. Strip sensitive fields
    const {
      password,
      hashedRefreshToken,
      codeOtp,
      codeOtpExpiration,
      isOtpVerified,
      ...safe
    } = updated;
    return safe;
  }

  async handleAdminDeleteUser(targetId: number) {
    // 1. Check user exists
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    // 2. Soft delete — deactivate account
    await this.prisma.user.update({
      where: { id: targetId },
      data: { isActive: false },
    });

    return { message: 'Tài khoản đã bị vô hiệu hóa.' };
  }
}

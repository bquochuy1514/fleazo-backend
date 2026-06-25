/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.handleGetProfile(user);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.handleUpdateProfile(user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  async updateAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh để tải lên.');
    }
    return this.usersService.handleUpdateAvatar(user.id, file);
  }

  @Put('me/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.handleChangePassword(user.id, dto);
  }

  @Get(':id/public')
  async getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.handleGetPublicProfile(id);
  }
}

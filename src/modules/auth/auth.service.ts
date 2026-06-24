import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { hashPassword } from '../../common/utils/hash.util';
import { MailService } from '../mail/mail.service';
import dayjs from 'dayjs';
import { randomInt } from 'crypto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async handleRegister(registerDto: RegisterDto) {
    // 1. Check existing user
    const existingUser = await this.usersService.findUserByEmail(
      registerDto.email,
    );

    if (existingUser) {
      throw new BadRequestException(
        'Email này đã tồn tại trong hệ thống! Vui lòng đăng nhập hoặc đăng ký bằng email khác.',
      );
    }

    // 2. Hash Password
    const hashedPassword = await hashPassword(registerDto.password);

    // 3. Generate OTP
    const codeOtp = randomInt(100000, 999999).toString();
    const codeOtpExpiration = dayjs().add(5, 'minutes').toDate();

    // 4. Create User
    await this.usersService.createUser({
      fullName: registerDto.fullName,
      email: registerDto.email,
      password: hashedPassword,
      codeOtp,
      codeOtpExpiration,
    });

    // 5. Send OTP email
    this.mailService
      .sendOtpVerification(registerDto.email, codeOtp)
      .catch((err) => {
        console.error('Failed to send OTP email:', err);
      });

    return {
      message:
        'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
    };
  }

  async handleVerifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, codeOtp } = verifyOtpDto;

    // 1. Find user
    const user = await this.usersService.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn.',
      );
    }

    // 2. Check already active
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt trước đó.');
    }

    // 3. Check OTP match
    if (user.codeOtp !== codeOtp) {
      throw new BadRequestException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn.',
      );
    }

    // 4. Check OTP expiration
    if (!user.codeOtpExpiration || dayjs().isAfter(user.codeOtpExpiration)) {
      throw new BadRequestException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn.',
      );
    }

    // 5. Activate account
    await this.usersService.updateUser(user.id, {
      isActive: true,
      codeOtp: null,
      codeOtpExpiration: null,
    });

    return { message: 'Kích hoạt tài khoản thành công! Vui lòng đăng nhập.' };
  }
}

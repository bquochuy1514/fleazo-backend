/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { comparePassword, hashPassword } from '../../common/utils/hash.util';
import { MailService } from '../mail/mail.service';
import dayjs from 'dayjs';
import { randomInt } from 'crypto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyForgotOtpDto } from './dto/verify-forgot-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  async handleLogin(loginDto: LoginDto) {
    // 1. Validate user credentials
    const user = await this.validateUser(loginDto);

    // 2. Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // 3. Hash refresh token and save to DB
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.usersService.updateUser(user.id, { hashedRefreshToken });

    // 4. Return tokens
    return {
      message: 'Đăng nhập thành công.',
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

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

  async handleResendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    // 1. Find user
    const user = await this.usersService.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Email không tồn tại trong hệ thống.');
    }

    // 2. Check already active
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt trước đó.');
    }

    // 3. Generate new OTP
    const codeOtp = randomInt(100000, 999999).toString();
    const codeOtpExpiration = dayjs().add(5, 'minutes').toDate();

    // 4. Update user with new OTP
    await this.usersService.updateUser(user.id, { codeOtp, codeOtpExpiration });

    // 5. Send OTP email
    this.mailService.sendOtpVerification(email, codeOtp).catch((err) => {
      console.error('Failed to resend OTP email:', err);
    });

    return { message: 'Mã OTP mới đã được gửi đến email của bạn.' };
  }

  async validateUser(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Find user by email
    const user = await this.usersService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 2. Compare password
    if (!user.password) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 3. Check account active
    if (!user.isActive) {
      throw new BadRequestException(
        'Tài khoản chưa được kích hoạt! Vui lòng kiểm tra email để xác thực tài khoản.',
      );
    }

    // 4. Return user without sensitive fields
    const {
      password: _,
      hashedRefreshToken,
      codeOtp,
      codeOtpExpiration,
      isOtpVerified,
      ...safeUser
    } = user;
    return safeUser;
  }

  async generateTokens(user: any) {
    const payload = { id: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async validateRefreshToken(payload: any, refreshToken: string) {
    // 1. Find user by email
    const user = await this.usersService.findUserByEmail(payload.email);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    // 2. Verify refresh token against hashed value in DB
    const isRefreshTokenValid = await argon2.verify(
      user.hashedRefreshToken,
      refreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return payload;
  }

  async handleRefreshToken(user: any) {
    // 1. Generate new tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // 2. Hash new refresh token and update DB
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.usersService.updateUser(user.id, { hashedRefreshToken });

    // 3. Return new tokens
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async handleLogout(userId: number) {
    // 1. Clear hashed refresh token in DB
    await this.usersService.updateUser(userId, { hashedRefreshToken: null });

    return { message: 'Đăng xuất thành công.' };
  }

  async handleForgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // 1. Find user
    const user = await this.usersService.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Email không tồn tại trong hệ thống.');
    }

    // 2. Check active
    if (!user.isActive) {
      throw new BadRequestException(
        'Tài khoản chưa được kích hoạt. Vui lòng xác thực email trước.',
      );
    }

    // 3. Generate OTP
    const codeOtp = randomInt(100000, 999999).toString();
    const codeOtpExpiration = dayjs().add(5, 'minutes').toDate();

    // 4. Save OTP to DB
    await this.usersService.updateUser(user.id, {
      codeOtp,
      codeOtpExpiration,
      isOtpVerified: false,
    });

    // 5. Send OTP email
    this.mailService.sendForgotPasswordOtp(email, codeOtp).catch((err) => {
      console.error('Failed to send forgot password OTP email:', err);
    });

    return { message: 'Vui lòng kiểm tra email để nhận mã OTP.' };
  }

  async handleVerifyForgotOtp(verifyForgotOtpDto: VerifyForgotOtpDto) {
    const { email, codeOtp } = verifyForgotOtpDto;

    // 1. Find user
    const user = await this.usersService.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    // 2. Check OTP match
    if (user.codeOtp !== codeOtp) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    // 3. Check OTP expiration
    if (!user.codeOtpExpiration || dayjs().isAfter(user.codeOtpExpiration)) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    // 4. Mark OTP as verified
    await this.usersService.updateUser(user.id, {
      codeOtp: null,
      codeOtpExpiration: null,
      isOtpVerified: true,
    });

    return { message: 'Xác thực OTP thành công.' };
  }

  async handleResetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, password } = resetPasswordDto;

    // 1. Find user
    const user = await this.usersService.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Email không tồn tại trong hệ thống.');
    }

    // 2. Check OTP verified
    if (!user.isOtpVerified) {
      throw new BadRequestException(
        'Vui lòng xác thực mã OTP trước khi đổi mật khẩu.',
      );
    }

    // 3. Hash new password
    const hashedPassword = await hashPassword(password);

    // 4. Update password and reset OTP verified flag
    await this.usersService.updateUser(user.id, {
      password: hashedPassword,
      isOtpVerified: false,
    });

    return { message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.' };
  }
}

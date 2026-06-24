import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { hashPassword } from '../../common/utils/hash.util';
import { MailService } from '../mail/mail.service';

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
    const codeOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeOtpExpiration = new Date(Date.now() + 5 * 60 * 1000);

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
}

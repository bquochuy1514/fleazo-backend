import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

// For accounts with no password yet (Google-login users) to set one for the
// first time — no old password required, unlike the regular change-password
// flow, since the caller is already authenticated via a valid access token
// (JwtAuthGuard) at the point this is called.
export class SetInitialPasswordDto {
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;

  @IsString({ message: 'Xác nhận phải là chuỗi ký tự' })
  @Match('password', { message: 'Mật khẩu xác nhận không khớp' })
  @IsNotEmpty({ message: 'Xác nhận không được để trống' })
  confirmPassword: string;
}

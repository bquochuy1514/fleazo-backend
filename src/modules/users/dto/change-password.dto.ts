import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

export class ChangePasswordDto {
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  currentPassword: string;

  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số',
  })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  newPassword: string;

  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi ký tự' })
  @Match('newPassword', { message: 'Mật khẩu xác nhận không khớp' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmNewPassword: string;
}

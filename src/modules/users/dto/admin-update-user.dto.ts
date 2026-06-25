import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../../generated/prisma/client';

export class AdminUpdateUserDto {
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  @IsOptional()
  role?: UserRole;

  @IsBoolean({ message: 'isBanned phải là boolean' })
  @IsOptional()
  isBanned?: boolean;
}

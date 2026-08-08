import { IsNotEmpty, IsString } from 'class-validator';

export class PurchaseMembershipDto {
  @IsString({ message: 'Mã gói phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng chọn một gói thành viên' })
  planKey: string;
}

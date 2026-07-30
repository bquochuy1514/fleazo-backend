import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';

// Narrow field set — a full User or a matching Prisma `select` result both work.
// universityId is deliberately excluded: not every seller is a university student.
export interface SellerProfileFields {
  phone: string | null;
  provinceCode: number | null;
  wardCode: number | null;
  password: string | null;
}

export function assertSellerProfileComplete(
  seller: SellerProfileFields | null,
): void {
  const isComplete =
    !!seller?.phone &&
    seller?.provinceCode !== null &&
    seller?.wardCode !== null &&
    !!seller?.password;

  if (!isComplete) {
    throw new BadRequestException({
      message: 'Vui lòng hoàn thiện hồ sơ trước khi đăng bán sản phẩm',
      errorCode: ErrorCode.INCOMPLETE_SELLER_PROFILE,
    });
  }
}

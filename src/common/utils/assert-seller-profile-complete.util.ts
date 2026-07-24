import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';

// Only the fields this check cares about — callers can pass a full User or
// just a narrow Prisma `select` result containing these.
export interface SellerProfileFields {
  phone: string | null;
  provinceCode: number | null;
  wardCode: number | null;
  universityId: number | null;
  password: string | null;
}

export function assertSellerProfileComplete(
  seller: SellerProfileFields | null,
): void {
  const isComplete =
    !!seller?.phone &&
    seller?.provinceCode !== null &&
    seller?.wardCode !== null &&
    !!seller?.universityId &&
    !!seller?.password;

  if (!isComplete) {
    throw new BadRequestException({
      message: 'Vui lòng hoàn thiện hồ sơ trước khi đăng bán sản phẩm',
      errorCode: ErrorCode.INCOMPLETE_SELLER_PROFILE,
    });
  }
}

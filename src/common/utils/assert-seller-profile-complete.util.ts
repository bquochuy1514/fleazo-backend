import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';

// Only the fields this check cares about — callers can pass a full User or
// just a narrow Prisma `select` result containing these. universityId is
// deliberately NOT included — not every seller is a university student, so
// it can't be a hard requirement to sell (see University field comment in
// schema.prisma).
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

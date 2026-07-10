import { IsArray, IsInt, IsOptional, ArrayNotEmpty } from 'class-validator';

export class UpdateProductImagesDto {
  @IsArray({ message: 'deleteIds phải là mảng' })
  @IsInt({ each: true, message: 'deleteIds phải chứa số nguyên' })
  @IsOptional()
  deleteIds?: number[];

  @ArrayNotEmpty({ message: 'order không được để trống' })
  @IsInt({ each: true, message: 'order phải chứa số nguyên' })
  @IsArray({ message: 'order phải là mảng' })
  order: number[];
}

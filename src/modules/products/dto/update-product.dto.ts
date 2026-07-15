import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  // JSON string array of existing ProductImage ids to delete, e.g. "[3,5]"
  @IsOptional()
  @IsString({ message: 'deleteImageIds phải là chuỗi JSON hợp lệ' })
  deleteImageIds?: string;

  // JSON string array describing the final image order, mixing existing (by id)
  // and newly uploaded (by fileIndex) images, e.g.:
  // '[{"type":"existing","id":12},{"type":"new","fileIndex":0}]'
  @IsOptional()
  @IsString({ message: 'imagesOrder phải là chuỗi JSON hợp lệ' })
  imagesOrder?: string;
}

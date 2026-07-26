import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { UserRole } from '../../generated/prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RejectProductDto } from './dto/reject-product.dto';

// Generous hard ceiling multer itself enforces before parsing — just to stop
// a client from attaching an absurd number of files. The real business limit
// (MAX_IMAGES_PER_UPLOAD, see products.service.ts) is checked in the service
// with a friendly Vietnamese message instead: multer's own count limit throws
// an unfriendly raw "Unexpected field - images" BadRequestException when
// exceeded, so it's deliberately not used as the exact enforcement point.
const MULTER_FILE_COUNT_CEILING = 20;

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', MULTER_FILE_COUNT_CEILING, {
      storage: memoryStorage(),
    }),
  )
  @Post()
  createProduct(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.createProduct(user.id, dto, files);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', MULTER_FILE_COUNT_CEILING, {
      storage: memoryStorage(),
    }),
  )
  @Post('listing-assistant/suggest')
  suggestListing(@UploadedFiles() files: Express.Multer.File[]) {
    return this.productsService.suggestListing(files);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', MULTER_FILE_COUNT_CEILING, {
      storage: memoryStorage(),
    }),
  )
  @Post('draft')
  createDraft(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.createDraft(user.id, dto, files);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', MULTER_FILE_COUNT_CEILING, {
      storage: memoryStorage(),
    }),
  )
  @Patch(':id')
  updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.updateProduct(user.id, id, dto, files);
  }

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  approveProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.approveProduct(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject')
  rejectProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectProductDto,
  ) {
    return this.productsService.rejectProduct(id, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  saveProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.saveProduct(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/save')
  unsaveProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.unsaveProduct(user.id, id);
  }
}

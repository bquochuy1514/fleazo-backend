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
import { QueryMyProductsDto } from './dto/query-my-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { RejectProductDto } from './dto/reject-product.dto';

// Generous ceiling multer enforces before parsing; the real business limit (MAX_IMAGES_PER_UPLOAD) is checked in the service.
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

  // Seller-driven status transitions, whitelisted per current status in ProductsService.updateProductStatus.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateProductStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateProductStatus(user.id, id, dto);
  }

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  // Must come before @Get(':id') — otherwise 'me' is parsed as the :id param and rejected by ParseIntPipe.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMyProducts(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryMyProductsDto,
  ) {
    return this.productsService.findMyProducts(user.id, query);
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

  // Re-review for an edit to an already-ACTIVE listing, separate from the original PENDING -> ACTIVE/REJECTED submission above.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/revision/approve')
  approveRevision(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.approveRevision(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/revision/reject')
  rejectRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectProductDto,
  ) {
    return this.productsService.rejectRevision(id, dto.reason);
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

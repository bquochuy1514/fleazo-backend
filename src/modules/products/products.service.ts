/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import FormData from 'form-data';
import dayjs from 'dayjs';
import { PrismaService } from '../../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CategoriesService } from '../categories/categories.service';
import { parseJsonArray } from '../../common/utils/parse-json-array.util';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { QueryMyProductsDto } from './dto/query-my-products.dto';
import { QuerySavedProductsDto } from './dto/query-saved-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { Prisma, ProductStatus } from '../../generated/prisma/client';
import { assertSellerProfileComplete } from '../../common/utils/assert-seller-profile-complete.util';
import {
  buildProductSearchText,
  normalizeSearchText,
} from '../../common/utils/normalize-search-text.util';
import fleazoAiConfig from '../../config/fleazo-ai.config';
import { resolveProductSearch } from './product-search.util';

// Placeholder listing duration until the Membership tier module sets this per-tier
const DEFAULT_LISTING_DURATION_DAYS = 30;

// Temporary hard cap until the Membership tier module enforces per-tier image limits.
export const MAX_IMAGES_PER_UPLOAD = 5;

// Shared select shape so createProduct and updateProductStatus check the same fields.
const SELLER_PROFILE_SELECT = {
  phone: true,
  provinceCode: true,
  wardCode: true,
  password: true,
} as const;

// Which status(es) a seller may transition their own listing INTO, keyed by the
// listing's CURRENT status. Separate from admin's approve/reject (PENDING -> ACTIVE/REJECTED).
// Statuses with no seller-initiated way out require creating a new listing instead.
const SELLER_ALLOWED_STATUS_TRANSITIONS: Record<
  ProductStatus,
  ProductStatus[]
> = {
  [ProductStatus.DRAFT]: [ProductStatus.PENDING, ProductStatus.CANCELLED],
  [ProductStatus.PENDING]: [ProductStatus.CANCELLED],
  [ProductStatus.ACTIVE]: [ProductStatus.SOLD, ProductStatus.CANCELLED],
  [ProductStatus.REJECTED]: [],
  [ProductStatus.SOLD]: [],
  [ProductStatus.EXPIRED]: [],
  [ProductStatus.CANCELLED]: [],
  [ProductStatus.BANNED]: [],
};

type ImageOrderItem =
  | { type: 'existing'; id: number }
  | { type: 'new'; fileIndex: number };

export interface ListingSuggestion {
  title: string;
  description: string;
  categoryId: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly categoriesService: CategoriesService,
    private readonly httpService: HttpService,
    @Inject(fleazoAiConfig.KEY)
    private readonly fleazoAiConfiguration: ConfigType<typeof fleazoAiConfig>,
  ) {}

  private async uploadProductImages(files: Express.Multer.File[]) {
    // 1. Upload images one by one, tracking what succeeded so far
    const uploaded: { secure_url: string; public_id: string }[] = [];

    try {
      for (const file of files) {
        const result = await this.uploadService.uploadImage(
          file,
          'fleazo/products',
        );
        uploaded.push(result);
      }
      return uploaded;
    } catch (error) {
      // 2. Roll back any images that were already uploaded before the failure,
      //    so a failed request never leaves orphaned Cloudinary assets
      await Promise.all(
        uploaded.map((img) => this.uploadService.deleteImage(img.public_id)),
      );
      throw error;
    }
  }

  private resolveImageChanges(
    currentImages: { id: number; publicId: string; order: number }[],
    deleteImageIdsRaw: string | undefined,
    imagesOrderRaw: string | undefined,
    newFilesCount: number,
  ) {
    // 1. Parse and validate deleteImageIds all belong to this product
    const deleteImageIds = parseJsonArray<number>(
      deleteImageIdsRaw,
      'deleteImageIds',
    );
    const currentImageIds = new Set(currentImages.map((img) => img.id));
    for (const id of deleteImageIds) {
      if (!currentImageIds.has(id)) {
        throw new BadRequestException(
          `Ảnh id=${id} không thuộc sản phẩm này hoặc không tồn tại`,
        );
      }
    }

    const remainingImages = currentImages.filter(
      (img) => !deleteImageIds.includes(img.id),
    );

    // 2. Parse and validate imagesOrder — if provided, it must be a complete,
    //    exact mapping of every remaining existing image + every new file
    const imagesOrder = parseJsonArray<ImageOrderItem>(
      imagesOrderRaw,
      'imagesOrder',
    );

    if (imagesOrder.length > 0) {
      const remainingIds = new Set(remainingImages.map((img) => img.id));
      const seenExistingIds = new Set<number>();
      const seenFileIndexes = new Set<number>();

      for (const item of imagesOrder) {
        if (item.type === 'existing') {
          if (item.id === undefined || !remainingIds.has(item.id)) {
            throw new BadRequestException(
              'imagesOrder chứa ảnh không hợp lệ hoặc đã bị xoá',
            );
          }
          if (seenExistingIds.has(item.id)) {
            throw new BadRequestException('imagesOrder chứa ảnh trùng lặp');
          }
          seenExistingIds.add(item.id);
        } else if (item.type === 'new') {
          if (
            item.fileIndex === undefined ||
            item.fileIndex < 0 ||
            item.fileIndex >= newFilesCount
          ) {
            throw new BadRequestException(
              'imagesOrder tham chiếu ảnh mới không hợp lệ',
            );
          }
          if (seenFileIndexes.has(item.fileIndex)) {
            throw new BadRequestException('imagesOrder chứa ảnh mới trùng lặp');
          }
          seenFileIndexes.add(item.fileIndex);
        } else {
          throw new BadRequestException('imagesOrder có type không hợp lệ');
        }
      }

      if (
        seenExistingIds.size !== remainingImages.length ||
        seenFileIndexes.size !== newFilesCount
      ) {
        throw new BadRequestException(
          'imagesOrder phải liệt kê đầy đủ tất cả ảnh cuối cùng',
        );
      }
    }

    return { deleteImageIds, remainingImages, imagesOrder };
  }

  async createProduct(
    sellerId: number,
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    // 1. This always creates a PENDING (public-facing) listing, so the seller
    //    must have a complete profile — phone, address, university, password
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: SELLER_PROFILE_SELECT,
    });
    assertSellerProfileComplete(seller);

    // 2. Validate category exists and is a leaf category
    await this.categoriesService.validateLeafCategory(dto.categoryId);

    // 3. Submitting for review requires at least 1 image, and at most
    //    MAX_IMAGES_PER_UPLOAD
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng tải lên ít nhất 1 ảnh sản phẩm');
    }
    if (files.length > MAX_IMAGES_PER_UPLOAD) {
      throw new BadRequestException(
        `Chỉ được tải lên tối đa ${MAX_IMAGES_PER_UPLOAD} ảnh mỗi tin đăng`,
      );
    }

    // 4. Upload all images to Cloudinary, rolling back on partial failure
    const uploadedImages = await this.uploadProductImages(files);

    // 5. Create product and its images atomically (single Prisma nested write)
    return this.prisma.product.create({
      data: {
        ...dto,
        searchTitle: normalizeSearchText(dto.title),
        searchText: buildProductSearchText(dto.title, dto.description),
        sellerId,
        status: ProductStatus.PENDING,
        images: {
          create: uploadedImages.map((img, index) => ({
            url: img.secure_url,
            publicId: img.public_id,
            order: index,
          })),
        },
      },
      include: { category: true, images: true },
    });
  }

  async createDraft(
    sellerId: number,
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    // 1. Validate category exists and is a leaf category
    await this.categoriesService.validateLeafCategory(dto.categoryId);

    // 2. Images are optional for drafts — upload whatever was provided (can be
    //    none), but still capped at MAX_IMAGES_PER_UPLOAD
    if (files && files.length > MAX_IMAGES_PER_UPLOAD) {
      throw new BadRequestException(
        `Chỉ được tải lên tối đa ${MAX_IMAGES_PER_UPLOAD} ảnh mỗi tin đăng`,
      );
    }
    const uploadedImages =
      files && files.length > 0 ? await this.uploadProductImages(files) : [];

    // 3. Create product and its images atomically
    return this.prisma.product.create({
      data: {
        ...dto,
        searchTitle: normalizeSearchText(dto.title),
        searchText: buildProductSearchText(dto.title, dto.description),
        sellerId,
        status: ProductStatus.DRAFT,
        images: {
          create: uploadedImages.map((img, index) => ({
            url: img.secure_url,
            publicId: img.public_id,
            order: index,
          })),
        },
      },
      include: { category: true, images: true },
    });
  }

  async updateProduct(
    sellerId: number,
    productId: number,
    dto: UpdateProductDto,
    files: Express.Multer.File[],
  ) {
    // 1. Fetch product with images + category, verify existence and ownership.
    //    category is only actually needed for the ACTIVE/staged-revision
    //    response shape below, but fetched unconditionally to keep this one
    //    query shared by both branches.
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, category: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sản phẩm này');
    }

    // 2. Validate paired location fields — code and name must travel together
    const { provinceCode, provinceName, wardCode, wardName } = dto;
    const provincePairBroken =
      (provinceCode !== undefined) !== (provinceName !== undefined);
    const wardPairBroken =
      (wardCode !== undefined) !== (wardName !== undefined);
    if (provincePairBroken || wardPairBroken) {
      throw new BadRequestException(
        'Vui lòng cung cấp đầy đủ mã và tên của tỉnh/thành phố hoặc phường/xã.',
      );
    }

    // 3. Validate category if it's being changed
    if (dto.categoryId !== undefined) {
      await this.categoriesService.validateLeafCategory(dto.categoryId);
    }

    // 4. Resolve delete/order instructions against the current image set
    const newFilesCount = files?.length ?? 0;
    const { deleteImageIds, remainingImages, imagesOrder } =
      this.resolveImageChanges(
        product.images,
        dto.deleteImageIds,
        dto.imagesOrder,
        newFilesCount,
      );

    // 5. Enforce at least 1 image in the final result (unless still a draft),
    //    and at most MAX_IMAGES_PER_UPLOAD regardless of status
    const finalImageCount = remainingImages.length + newFilesCount;
    if (product.status !== ProductStatus.DRAFT && finalImageCount === 0) {
      throw new BadRequestException(
        'Sản phẩm phải có ít nhất 1 ảnh, không thể xoá hết ảnh',
      );
    }
    if (finalImageCount > MAX_IMAGES_PER_UPLOAD) {
      throw new BadRequestException(
        `Chỉ được có tối đa ${MAX_IMAGES_PER_UPLOAD} ảnh mỗi tin đăng`,
      );
    }

    // 6. Upload new images to Cloudinary, rolling back on partial failure
    const uploadedImages =
      newFilesCount > 0 ? await this.uploadProductImages(files) : [];

    // 7. Final order — explicit imagesOrder if given, otherwise: kept images in
    //    their current order, followed by new images in upload order
    const finalOrder: ImageOrderItem[] =
      imagesOrder.length > 0
        ? imagesOrder
        : [
            ...remainingImages
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((img) => ({ type: 'existing' as const, id: img.id })),
            ...uploadedImages.map((_, fileIndex) => ({
              type: 'new' as const,
              fileIndex,
            })),
          ];

    // 8. Strip image-instruction fields out of dto before using it as Product data
    const { deleteImageIds: _di, imagesOrder: _io, ...productFields } = dto;

    // 9. ACTIVE listings are already publicly visible — stage the edit as a
    //    ProductRevision instead of applying it, so the live listing keeps
    //    showing its current, already-approved content until an admin
    //    approves or rejects the change. Every other status still applies
    //    immediately below.
    if (product.status === ProductStatus.ACTIVE) {
      const revision = await this.stageRevision(
        product,
        productFields,
        finalOrder,
        uploadedImages,
      );
      return { ...product, revision };
    }

    // 10. Apply text update + image delete/reorder/create atomically
    const updated = await this.prisma.$transaction(async (tx) => {
      if (deleteImageIds.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: deleteImageIds } },
        });
      }

      await Promise.all(
        finalOrder.map((item, order) =>
          item.type === 'existing'
            ? tx.productImage.update({
                where: { id: item.id },
                data: { order },
              })
            : tx.productImage.create({
                data: {
                  productId,
                  url: uploadedImages[item.fileIndex].secure_url,
                  publicId: uploadedImages[item.fileIndex].public_id,
                  order,
                },
              }),
        ),
      );

      const title = productFields.title ?? product.title;
      const description = productFields.description ?? product.description;

      return tx.product.update({
        where: { id: productId },
        data: {
          ...productFields,
          searchTitle: normalizeSearchText(title),
          searchText: buildProductSearchText(title, description),
        },
        include: { category: true, images: { orderBy: { order: 'asc' } } },
      });
    });

    // 11. Clean up deleted images from Cloudinary only after the DB transaction commits
    const deletedImages = product.images.filter((img) =>
      deleteImageIds.includes(img.id),
    );
    await Promise.all(
      deletedImages.map((img) => this.uploadService.deleteImage(img.publicId)),
    );

    return updated;
  }

  // Stages an ACTIVE listing's edit as a ProductRevision instead of applying it immediately.
  private async stageRevision(
    product: Prisma.ProductGetPayload<{
      include: { images: true; category: true };
    }>,
    productFields: Partial<CreateProductDto>,
    finalOrder: ImageOrderItem[],
    uploadedImages: { secure_url: string; public_id: string }[],
  ) {
    // 1. Merge the seller's changes over the listing's current values — the
    //    revision stores a full snapshot, not a partial diff, so approving
    //    it later is a straight field copy (see schema.prisma comment).
    const snapshot = {
      title: productFields.title ?? product.title,
      description: productFields.description ?? product.description,
      price: productFields.price ?? product.price,
      condition: productFields.condition ?? product.condition,
      categoryId: productFields.categoryId ?? product.categoryId,
      provinceCode: productFields.provinceCode ?? product.provinceCode,
      provinceName: productFields.provinceName ?? product.provinceName,
      wardCode: productFields.wardCode ?? product.wardCode,
      wardName: productFields.wardName ?? product.wardName,
      addressDetail:
        productFields.addressDetail !== undefined
          ? productFields.addressDetail
          : product.addressDetail,
    };

    // 2. Resolve the revision's own image list in finalOrder, copying
    //    url/publicId from either a kept live image or a newly uploaded one
    //    — never referencing the live ProductImage rows directly, since
    //    those must stay untouched while only pending.
    const imagesById = new Map(product.images.map((img) => [img.id, img]));
    const revisionImages = finalOrder.map((item, order) => {
      if (item.type === 'existing') {
        const img = imagesById.get(item.id);
        if (!img) {
          throw new BadRequestException('imagesOrder chứa ảnh không hợp lệ');
        }
        return { url: img.url, publicId: img.publicId, order };
      }
      const uploaded = uploadedImages[item.fileIndex];
      return {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        order,
      };
    });

    // 3. A second edit while one revision is already pending replaces it —
    //    clean up any of its staged Cloudinary assets that aren't ALSO part
    //    of the live product (those are still live, never delete them).
    const existingRevision = await this.prisma.productRevision.findUnique({
      where: { productId: product.id },
      include: { images: true },
    });
    if (existingRevision) {
      const livePublicIds = new Set(product.images.map((img) => img.publicId));
      const orphaned = existingRevision.images.filter(
        (img) => !livePublicIds.has(img.publicId),
      );
      await this.prisma.productRevision.delete({
        where: { id: existingRevision.id },
      });
      await Promise.all(
        orphaned.map((img) => this.uploadService.deleteImage(img.publicId)),
      );
    }

    // 4. Create the fresh revision
    return this.prisma.productRevision.create({
      data: {
        productId: product.id,
        ...snapshot,
        images: { create: revisionImages },
      },
      include: { images: { orderBy: { order: 'asc' } } },
    });
  }

  // Copies a pending revision's snapshot onto the live Product/ProductImage rows, then deletes it.
  async approveRevision(productId: number) {
    // 1. Fetch product + its pending revision, verify one actually exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, revision: { include: { images: true } } },
    });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    if (!product.revision) {
      throw new BadRequestException(
        'Sản phẩm này không có thay đổi nào đang chờ duyệt',
      );
    }
    const revision = product.revision;

    // 2. Diff the revision's image snapshot against the live images —
    //    what to remove, what's brand new, what's kept (may just need a
    //    new order)
    const keepPublicIds = new Set(revision.images.map((img) => img.publicId));
    const livePublicIds = new Set(product.images.map((img) => img.publicId));
    const toDelete = product.images.filter(
      (img) => !keepPublicIds.has(img.publicId),
    );
    const toCreate = revision.images.filter(
      (img) => !livePublicIds.has(img.publicId),
    );
    const toReorder = revision.images.filter((img) =>
      livePublicIds.has(img.publicId),
    );

    // 3. Apply the revision's snapshot onto the live Product/ProductImage
    //    rows, then delete the revision, atomically
    const updated = await this.prisma.$transaction(async (tx) => {
      if (toDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: toDelete.map((img) => img.id) } },
        });
      }

      await Promise.all([
        ...toCreate.map((img) =>
          tx.productImage.create({
            data: {
              productId,
              url: img.url,
              publicId: img.publicId,
              order: img.order,
            },
          }),
        ),
        ...toReorder.map((img) => {
          const live = product.images.find((p) => p.publicId === img.publicId)!;
          return tx.productImage.update({
            where: { id: live.id },
            data: { order: img.order },
          });
        }),
      ]);

      const result = await tx.product.update({
        where: { id: productId },
        data: {
          title: revision.title,
          description: revision.description,
          searchTitle: normalizeSearchText(revision.title),
          searchText: buildProductSearchText(
            revision.title,
            revision.description,
          ),
          price: revision.price,
          condition: revision.condition,
          categoryId: revision.categoryId,
          provinceCode: revision.provinceCode,
          provinceName: revision.provinceName,
          wardCode: revision.wardCode,
          wardName: revision.wardName,
          addressDetail: revision.addressDetail,
        },
        include: { category: true, images: { orderBy: { order: 'asc' } } },
      });

      await tx.productRevision.delete({ where: { id: revision.id } });

      return result;
    });

    // 4. Clean up the now-removed images from Cloudinary only after the DB
    //    transaction commits — never the ones still referenced by the
    //    now-live images (toCreate/toReorder all stay)
    await Promise.all(
      toDelete.map((img) => this.uploadService.deleteImage(img.publicId)),
    );

    return updated;
  }

  // Discards a pending revision, live listing untouched; reason is logged only for now.
  async rejectRevision(productId: number, reason: string) {
    // 1. Fetch product + its pending revision, verify one actually exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, revision: { include: { images: true } } },
    });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    if (!product.revision) {
      throw new BadRequestException(
        'Sản phẩm này không có thay đổi nào đang chờ duyệt',
      );
    }

    // 2. Discard the revision, cleaning up any Cloudinary assets it staged
    //    that aren't also part of the still-live product
    const livePublicIds = new Set(product.images.map((img) => img.publicId));
    const orphaned = product.revision.images.filter(
      (img) => !livePublicIds.has(img.publicId),
    );

    await this.prisma.productRevision.delete({
      where: { id: product.revision.id },
    });
    await Promise.all(
      orphaned.map((img) => this.uploadService.deleteImage(img.publicId)),
    );

    this.logger.log(`Revision for product ${productId} rejected: ${reason}`);

    return { message: 'Đã từ chối thay đổi, tin gốc giữ nguyên.' };
  }

  async updateProductStatus(
    sellerId: number,
    productId: number,
    dto: UpdateProductStatusDto,
  ) {
    // 1. Fetch product, verify existence and ownership
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Bạn không có quyền thay đổi trạng thái sản phẩm này',
      );
    }

    // 2. Only whitelisted transitions are allowed for the seller (not admin
    //    approve/reject, not resurrecting a REJECTED/BANNED/EXPIRED listing —
    //    those require creating a new listing instead)
    const allowedNextStatuses =
      SELLER_ALLOWED_STATUS_TRANSITIONS[product.status];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển sản phẩm từ trạng thái ${product.status} sang ${dto.status}`,
      );
    }

    // 3. Submitting for review (-> PENDING) requires a complete seller profile
    if (dto.status === ProductStatus.PENDING) {
      const seller = await this.prisma.user.findUnique({
        where: { id: sellerId },
        select: SELLER_PROFILE_SELECT,
      });
      assertSellerProfileComplete(seller);
    }

    // 4. Apply the transition
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: dto.status },
      include: { category: true, images: true },
    });
  }

  async findOne(id: number, userId?: number) {
    // 1. Fetch product with category (+ parent, for the "Cha/Con" breadcrumb
    //    line on the detail page), images (ordered), and public seller info
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { include: { parent: true } },
        images: { orderBy: { order: 'asc' } },
        seller: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            phone: true,
            avgRating: true,
            responseRate: true,
            university: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 2. Public detail page only ever shows ACTIVE products — same rule as findAll
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // 3. isSaved only resolvable for a logged-in viewer (OptionalJwtAuthGuard
    //    lets this endpoint stay public while still reporting save state)
    const isSaved = userId
      ? Boolean(
          await this.prisma.savedProduct.findUnique({
            where: { userId_productId: { userId, productId: id } },
          }),
        )
      : false;

    return { ...product, isSaved };
  }

  async approveProduct(id: number) {
    // 1. Verify product exists
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // 2. Can only approve a product that's still awaiting review
    if (product.status !== ProductStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể duyệt sản phẩm đang chờ duyệt');
    }

    // 3. Activate the listing, starting the listing duration countdown
    return this.prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.ACTIVE,
        expiresAt: dayjs().add(DEFAULT_LISTING_DURATION_DAYS, 'day').toDate(),
        rejectedReason: null,
      },
      include: { category: true, images: true },
    });
  }

  async rejectProduct(id: number, reason: string) {
    // 1. Verify product exists
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // 2. Can only reject a product that's still awaiting review
    if (product.status !== ProductStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể từ chối sản phẩm đang chờ duyệt',
      );
    }

    // 3. Reject with a reason so the seller knows what to fix
    return this.prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.REJECTED,
        rejectedReason: reason,
      },
      include: { category: true, images: true },
    });
  }

  async saveProduct(userId: number, productId: number) {
    // 1. Only ACTIVE products can be saved
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // 2. Sellers cannot save their own listings
    if (product.sellerId === userId) {
      throw new ForbiddenException('Bạn không thể lưu tin của chính mình');
    }

    // 3. Prevent duplicate saves
    const existing = await this.prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      throw new ConflictException('Sản phẩm đã được lưu trước đó');
    }

    // 4. Save and keep the saveCount cache in sync, atomically
    await this.prisma.$transaction([
      this.prisma.savedProduct.create({ data: { userId, productId } }),
      this.prisma.product.update({
        where: { id: productId },
        data: { saveCount: { increment: 1 } },
      }),
    ]);

    return { saved: true };
  }

  async unsaveProduct(userId: number, productId: number) {
    // 1. Verify the save actually exists
    const existing = await this.prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!existing) {
      throw new NotFoundException('Bạn chưa lưu sản phẩm này');
    }

    // 2. Unsave and keep the saveCount cache in sync, atomically
    await this.prisma.$transaction([
      this.prisma.savedProduct.delete({
        where: { userId_productId: { userId, productId } },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: { saveCount: { decrement: 1 } },
      }),
    ]);

    return { saved: false };
  }

  async findAll(query: QueryProductDto, userId?: number) {
    const {
      categoryId,
      provinceCode,
      wardCode,
      condition,
      minPrice,
      maxPrice,
      keyword,
      sellerUniversityId,
      sellerId,
      page = 1,
      limit = 20,
    } = query;

    // 1. Resolve category filter — supports both parent (aggregate children) and leaf category
    let categoryFilter: number[] | undefined;
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        include: { children: true },
      });

      if (!category) {
        throw new NotFoundException('Danh mục không tồn tại');
      }

      categoryFilter =
        category.parentId === null
          ? category.children.map((child) => child.id)
          : [category.id];
    }

    // 2. Build where clause — public listing only ever shows ACTIVE products
    const normalizedKeyword = keyword ? normalizeSearchText(keyword) : '';
    if (normalizedKeyword) {
      const categories = await this.prisma.category.findMany({
        include: { children: { select: { id: true } }, searchAliases: true },
      });
      const search = resolveProductSearch(normalizedKeyword, categories);
      const searchCategoryIds =
        categoryFilter && search.categoryIds
          ? categoryFilter.filter((id) => search.categoryIds!.includes(id))
          : (search.categoryIds ?? categoryFilter);

      if (search.categoryIds && searchCategoryIds?.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      const conditions: Prisma.Sql[] = [
        Prisma.sql`p.status = ${ProductStatus.ACTIVE}`,
      ];
      if (searchCategoryIds) {
        conditions.push(
          Prisma.sql`p.category_id IN (${Prisma.join(searchCategoryIds)})`,
        );
      }
      if (provinceCode)
        conditions.push(Prisma.sql`p.province_code = ${provinceCode}`);
      if (wardCode) conditions.push(Prisma.sql`p.ward_code = ${wardCode}`);
      if (condition) conditions.push(Prisma.sql`p.condition = ${condition}`);
      if (minPrice !== undefined)
        conditions.push(Prisma.sql`p.price >= ${minPrice}`);
      if (maxPrice !== undefined)
        conditions.push(Prisma.sql`p.price <= ${maxPrice}`);
      if (sellerUniversityId) {
        conditions.push(
          Prisma.sql`EXISTS (SELECT 1 FROM users s WHERE s.id = p.seller_id AND s.university_id = ${sellerUniversityId})`,
        );
      }
      if (sellerId) conditions.push(Prisma.sql`p.seller_id = ${sellerId}`);

      const tokenConditions = search.searchTokens.map(
        (token) => Prisma.sql`p.search_text LIKE ${`%${token}%`}`,
      );
      const titleTokenConditions = search.searchTokens.map(
        (token) => Prisma.sql`p.search_title LIKE ${`%${token}%`}`,
      );
      const textCondition = tokenConditions.length
        ? Prisma.sql`(${Prisma.join(tokenConditions, ' AND ')})`
        : undefined;
      const titleCondition = titleTokenConditions.length
        ? Prisma.sql`(${Prisma.join(titleTokenConditions, ' AND ')})`
        : undefined;
      let rank: Prisma.Sql;

      if (search.categoryOnly && search.categoryIds) {
        const fullKeywordPattern = `%${search.normalizedKeyword}%`;
        conditions.push(
          Prisma.sql`(p.search_text LIKE ${fullKeywordPattern} OR p.category_id IN (${Prisma.join(searchCategoryIds!)}))`,
        );
        rank = Prisma.sql`CASE WHEN p.search_title LIKE ${fullKeywordPattern} THEN 0 WHEN p.search_text LIKE ${fullKeywordPattern} THEN 1 ELSE 2 END`;
      } else {
        if (textCondition) conditions.push(textCondition);
        rank = titleCondition
          ? Prisma.sql`CASE WHEN ${titleCondition} THEN 0 ELSE 1 END`
          : Prisma.sql`0`;
      }

      const whereSql = Prisma.join(conditions, ' AND ');
      const [{ total }] = await this.prisma.$queryRaw<{ total: number }[]>(
        Prisma.sql`SELECT COUNT(*)::int AS total FROM products p WHERE ${whereSql}`,
      );
      const rows = await this.prisma.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT p.id FROM products p WHERE ${whereSql} ORDER BY ${rank}, p.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      );
      const ids = rows.map((row) => row.id);
      const data = ids.length
        ? await this.prisma.product.findMany({
            where: { id: { in: ids } },
            include: {
              category: true,
              images: true,
              seller: { select: { universityId: true } },
              savedBy: {
                where: { userId: userId ?? -1 },
                select: { productId: true },
              },
            },
          })
        : [];
      const productsById = new Map(
        data.map((product) => [product.id, product]),
      );

      return {
        data: ids.map((id) => {
          const { savedBy, seller, ...product } = productsById.get(id)!;
          return {
            ...product,
            sellerUniversityId: seller.universityId,
            isSaved: savedBy.length > 0,
          };
        }),
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      };
    }

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      ...(categoryFilter && { categoryId: { in: categoryFilter } }),
      ...(provinceCode && { provinceCode }),
      ...(wardCode && { wardCode }),
      ...(condition && { condition }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(sellerUniversityId && {
        seller: { universityId: sellerUniversityId },
      }),
      ...(sellerId && { sellerId }),
    };

    // 3. Query products and total count in parallel
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
          seller: {
            select: { universityId: true },
          },
          savedBy: {
            where: { userId: userId ?? -1 },
            select: { productId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // 4. Return paginated result
    return {
      data: data.map(({ savedBy, seller, ...product }) => ({
        ...product,
        sellerUniversityId: seller.universityId,
        isSaved: savedBy.length > 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Seller's own listings across every status, unlike findAll (ACTIVE-only, for public browsing).
  async findMyProducts(sellerId: number, query: QueryMyProductsDto) {
    const { status, keyword, page = 1, limit = 20 } = query;

    const where: Prisma.ProductWhereInput = {
      sellerId,
      ...(status && { status }),
      ...(keyword && {
        title: { contains: keyword, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        // revision: select keeps this to just what the "pending edit" badge needs.
        include: {
          category: true,
          images: true,
          revision: { select: { id: true, updatedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findSavedProducts(userId: number, query: QuerySavedProductsDto) {
    const { page = 1, limit = 20 } = query;
    const where: Prisma.SavedProductWhereInput = {
      userId,
      product: { status: ProductStatus.ACTIVE },
    };

    // 1. Fetch saved listings and their total using the same snapshot filters
    const [savedProducts, total] = await Promise.all([
      this.prisma.savedProduct.findMany({
        where,
        include: { product: { include: { category: true, images: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.savedProduct.count({ where }),
    ]);

    // 2. Keep the bookmark timestamp while returning the familiar product shape
    return {
      data: savedProducts.map(({ product, createdAt }) => ({
        product,
        savedAt: createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async suggestListing(files: Express.Multer.File[]) {
    // 1. Guard: at least one image required, at most MAX_IMAGES_PER_UPLOAD
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 ảnh để AI gợi ý.');
    }
    if (files.length > MAX_IMAGES_PER_UPLOAD) {
      throw new BadRequestException(
        `Chỉ được chọn tối đa ${MAX_IMAGES_PER_UPLOAD} ảnh để AI gợi ý`,
      );
    }

    // 2. Build multipart request body for fleazo-ai
    const form = new FormData();
    for (const file of files) {
      form.append('images', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }

    // 3. Call fleazo-ai, authenticated via shared-secret header
    try {
      const response = await firstValueFrom(
        this.httpService.post<ListingSuggestion>(
          `${this.fleazoAiConfiguration.baseUrl}/listing-assistant/suggest`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              'X-Internal-Api-Key': this.fleazoAiConfiguration.internalApiKey,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      // 4. fleazo-ai unreachable or returned an error — log the real cause
      //    server-side for debugging, surface a clean message to the client
      const detail = isAxiosError(error)
        ? `${error.code ?? error.response?.status} ${JSON.stringify(error.response?.data ?? error.message)}`
        : String(error);
      this.logger.error(`suggestListing failed: ${detail}`);
      throw new ServiceUnavailableException(
        'AI đang bận, vui lòng thử lại sau.',
      );
    }
  }
}

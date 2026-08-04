import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findProvinces(includeWards: boolean) {
    // 1. Read the seeded administrative snapshot from Fleazo's database
    return await this.prisma.province.findMany({
      orderBy: { name: 'asc' },
      ...(includeWards
        ? { include: { wards: { orderBy: { name: 'asc' } } } }
        : {}),
    });
  }
}

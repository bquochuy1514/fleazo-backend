import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UniversitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // 1. Small, seeded reference list (~300 rows) — no pagination needed,
    //    sorted alphabetically for a stable dropdown order on the frontend
    return this.prisma.university.findMany({
      orderBy: { name: 'asc' },
    });
  }
}

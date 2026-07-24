import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { categoriesSeedData } from './seed-data/categories';
import { universitiesSeedData } from './seed-data/universities';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function seedCategories() {
  console.log('Seeding categories...');

  for (const category of categoriesSeedData) {
    const { children, ...parentData } = category;

    // 1. Upsert parent category
    const parent = await prisma.category.upsert({
      where: { slug: parentData.slug },
      update: {},
      create: parentData,
    });

    // 2. Upsert each child category
    for (const child of children) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: {},
        create: { ...child, parentId: parent.id },
      });
    }
  }

  console.log('Seeded categories.');
}

async function seedUniversities() {
  console.log(`Seeding ${universitiesSeedData.length} universities...`);

  for (const uni of universitiesSeedData) {
    await prisma.university.upsert({
      where: { slug: uni.slug },
      update: {},
      create: uni,
    });
  }

  console.log('Seeded universities.');
}

async function main() {
  await seedCategories();
  await seedUniversities();
  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

import { PrismaClient, UserRole } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { hashPassword } from '../src/common/utils/hash.util';
import { normalizeSearchText } from '../src/common/utils/normalize-search-text.util';
import { categoriesSeedData } from './seed-data/categories';
import { locationsSeedData } from './seed-data/locations';
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
      const { searchAliases = [], ...childData } = child;
      const childCategory = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {},
        create: { ...childData, parentId: parent.id },
      });

      for (const alias of searchAliases) {
        await prisma.categorySearchAlias.upsert({
          where: { normalizedTerm: normalizeSearchText(alias) },
          update: { categoryId: childCategory.id },
          create: {
            normalizedTerm: normalizeSearchText(alias),
            categoryId: childCategory.id,
          },
        });
      }
    }
  }

  console.log('Seeded categories.');
}

async function seedUniversities() {
  console.log(`Seeding ${universitiesSeedData.length} universities...`);

  for (const uni of universitiesSeedData) {
    await prisma.university.upsert({
      where: { slug: uni.slug },
      update: { name: uni.name },
      create: uni,
    });
  }

  console.log('Seeded universities.');
}

async function seedLocations() {
  console.log(`Seeding ${locationsSeedData.length} provinces...`);

  for (const province of locationsSeedData) {
    await prisma.province.upsert({
      where: { code: province.code },
      update: { name: province.name },
      create: { code: province.code, name: province.name },
    });
  }

  const wards = locationsSeedData.flatMap((province) =>
    province.wards.map((ward) => ({
      code: ward.code,
      name: ward.name,
      provinceCode: province.code,
    })),
  );

  for (let index = 0; index < wards.length; index += 500) {
    await prisma.$transaction(
      wards.slice(index, index + 500).map((ward) =>
        prisma.ward.upsert({
          where: { code: ward.code },
          update: { name: ward.name, provinceCode: ward.provinceCode },
          create: ward,
        }),
      ),
    );
  }

  console.log(`Seeded ${wards.length} wards.`);
}

async function seedAdmin() {
  console.log('Seeding admin account...');

  const email = 'admin@fleazo.com';
  const password = await hashPassword('Fleazoadmin123!');

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      fullName: 'Fleazo Admin',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('Seeded admin account.');
}

async function main() {
  await seedCategories();
  await seedUniversities();
  await seedLocations();
  await seedAdmin();
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

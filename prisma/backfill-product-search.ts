import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  buildProductSearchText,
  normalizeSearchText,
} from '../src/common/utils/normalize-search-text.util';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, title: true, description: true },
  });

  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        searchTitle: normalizeSearchText(product.title),
        searchText: buildProductSearchText(product.title, product.description),
      },
    });
  }

  console.log(`Backfilled search text for ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding categories...');

  const categories = [
    {
      name: 'Điện tử & Công nghệ',
      slug: 'dien-tu-cong-nghe',
      children: [
        { name: 'Laptop', slug: 'laptop' },
        { name: 'Điện thoại', slug: 'dien-thoai' },
        { name: 'Máy tính bảng', slug: 'may-tinh-bang' },
        { name: 'Phụ kiện công nghệ', slug: 'phu-kien-cong-nghe' },
      ],
    },
    {
      name: 'Sách & Tài liệu',
      slug: 'sach-tai-lieu',
      children: [
        { name: 'Giáo trình', slug: 'giao-trinh' },
        { name: 'Sách tham khảo', slug: 'sach-tham-khao' },
        { name: 'Truyện & Văn học', slug: 'truyen-van-hoc' },
      ],
    },
    {
      name: 'Thời trang',
      slug: 'thoi-trang',
      children: [
        { name: 'Áo', slug: 'ao' },
        { name: 'Quần', slug: 'quan' },
        { name: 'Giày dép', slug: 'giay-dep' },
        { name: 'Phụ kiện thời trang', slug: 'phu-kien-thoi-trang' },
      ],
    },
    {
      name: 'Đồ dùng học tập',
      slug: 'do-dung-hoc-tap',
      children: [
        { name: 'Văn phòng phẩm', slug: 'van-phong-pham' },
        { name: 'Dụng cụ vẽ', slug: 'dung-cu-ve' },
        { name: 'Máy tính cầm tay', slug: 'may-tinh-cam-tay' },
      ],
    },
    {
      name: 'Nhà cửa & Đời sống',
      slug: 'nha-cua-doi-song',
      children: [
        { name: 'Nội thất', slug: 'noi-that' },
        { name: 'Đồ gia dụng', slug: 'do-gia-dung' },
        { name: 'Trang trí', slug: 'trang-tri' },
      ],
    },
    {
      name: 'Thể thao & Sở thích',
      slug: 'the-thao-so-thich',
      children: [
        { name: 'Dụng cụ thể thao', slug: 'dung-cu-the-thao' },
        { name: 'Nhạc cụ', slug: 'nhac-cu' },
        { name: 'Đồ chơi & Mô hình', slug: 'do-choi-mo-hinh' },
      ],
    },
    {
      name: 'Xe cộ',
      slug: 'xe-co',
      children: [
        { name: 'Xe đạp', slug: 'xe-dap' },
        { name: 'Phụ kiện xe máy', slug: 'phu-kien-xe-may' },
      ],
    },
    {
      name: 'Khác',
      slug: 'khac',
      children: [
        { name: 'Trao đổi', slug: 'trao-doi' },
        { name: 'Cho tặng', slug: 'cho-tang' },
      ],
    },
  ];

  for (const category of categories) {
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

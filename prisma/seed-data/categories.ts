// `image` is the homepage category-circle cutout — root categories only.
// Requirements: 1:1 square, transparent PNG, subject centered with margin
// (not edge-to-edge), ≥400×400px. Paste the Cloudinary URL between the quotes.
//
// Children are kept specific on purpose (e.g. "Bàn phím" and "Chuột" as
// separate entries, not folded into one "Phụ kiện máy tính") so a listing
// rarely has to fall back to a parent's catch-all "... khác" entry.
export const categoriesSeedData = [
  {
    name: 'Điện tử & Công nghệ',
    slug: 'dien-tu-cong-nghe',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/dien-tu-cong-nghe_av1ujn.png',
    children: [
      { name: 'Laptop', slug: 'laptop' },
      {
        name: 'Điện thoại',
        slug: 'dien-thoai',
        searchAliases: ['đt', 'phone', 'smartphone'],
      },
      {
        name: 'Máy tính bảng',
        slug: 'may-tinh-bang',
        searchAliases: ['tablet', 'ipad'],
      },
      {
        name: 'Màn hình máy tính',
        slug: 'man-hinh-may-tinh',
        searchAliases: ['monitor'],
      },
      { name: 'Bàn phím', slug: 'ban-phim', searchAliases: ['keyboard'] },
      {
        name: 'Chuột & Bàn di chuột',
        slug: 'chuot-ban-di-chuot',
        searchAliases: ['mouse'],
      },
      {
        name: 'Tai nghe',
        slug: 'tai-nghe',
        searchAliases: ['headphone', 'earphone'],
      },
      {
        name: 'Loa vi tính & Loa bluetooth',
        slug: 'loa-vi-tinh-loa-bluetooth',
        searchAliases: ['speaker'],
      },
      { name: 'Webcam & Micro', slug: 'webcam-micro' },
      {
        name: 'Ổ cứng & Thiết bị lưu trữ',
        slug: 'o-cung-thiet-bi-luu-tru',
        searchAliases: ['ssd', 'hdd', 'usb'],
      },
      { name: 'Sạc, cáp & Hub chuyển đổi', slug: 'sac-cap-hub-chuyen-doi' },
      {
        name: 'Router & Thiết bị mạng',
        slug: 'router-thiet-bi-mang',
        searchAliases: ['wifi'],
      },
      { name: 'Máy in, máy scan & Mực in', slug: 'may-in-may-scan-muc-in' },
      { name: 'Máy ảnh & Máy quay phim', slug: 'may-anh-may-quay-phim' },
      {
        name: 'Đồng hồ thông minh',
        slug: 'dong-ho-thong-minh',
        searchAliases: ['smartwatch'],
      },
      { name: 'Máy chơi game & Phụ kiện', slug: 'may-choi-game-phu-kien' },
      {
        name: 'Linh kiện máy tính',
        slug: 'linh-kien-may-tinh',
        searchAliases: ['ram', 'vga', 'cpu', 'mainboard'],
      },
      { name: 'Thiết bị điện tử khác', slug: 'thiet-bi-dien-tu-khac' },
    ],
  },
  {
    name: 'Sách & Tài liệu',
    slug: 'sach-tai-lieu',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/sach-tai-lieu_hnnxtp.png',
    children: [
      { name: 'Giáo trình đại học', slug: 'giao-trinh-dai-hoc' },
      { name: 'Sách chuyên ngành', slug: 'sach-chuyen-nganh' },
      {
        name: 'Sách ôn thi & Luyện thi',
        slug: 'sach-on-thi-luyen-thi',
        searchAliases: ['ielts', 'toeic'],
      },
      { name: 'Sách tham khảo', slug: 'sach-tham-khao' },
      { name: 'Truyện tranh & Manga', slug: 'truyen-tranh-manga' },
      { name: 'Tiểu thuyết & Văn học', slug: 'tieu-thuyet-van-hoc' },
      {
        name: 'Sách kỹ năng & Phát triển bản thân',
        slug: 'sach-ky-nang-phat-trien-ban-than',
      },
      { name: 'Sách ngoại ngữ', slug: 'sach-ngoai-ngu' },
      { name: 'Từ điển', slug: 'tu-dien' },
      { name: 'Tạp chí & Báo', slug: 'tap-chi-bao' },
    ],
  },
  {
    name: 'Đồ dùng học tập',
    slug: 'do-dung-hoc-tap',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/do-dung-hoc-tap_ch0px3.png',
    children: [
      { name: 'Bút, mực & Bút chì', slug: 'but-muc-but-chi' },
      { name: 'Vở, sổ tay & Giấy note', slug: 'vo-so-tay-giay-note' },
      {
        name: 'Thước kẻ, compa & Dụng cụ đo',
        slug: 'thuoc-ke-compa-dung-cu-do',
      },
      {
        name: 'Kẹp file, bìa hồ sơ & Bìa còng',
        slug: 'kep-file-bia-ho-so-bia-cong',
      },
      {
        name: 'Máy tính cầm tay',
        slug: 'may-tinh-cam-tay',
        searchAliases: ['casio'],
      },
      { name: 'Dụng cụ vẽ kỹ thuật', slug: 'dung-cu-ve-ky-thuat' },
      {
        name: 'Màu vẽ, cọ & Dụng cụ mỹ thuật',
        slug: 'mau-ve-co-dung-cu-my-thuat',
      },
      {
        name: 'Dụng cụ thí nghiệm Hóa - Sinh - Lý',
        slug: 'dung-cu-thi-nghiem-hoa-sinh-ly',
      },
      {
        name: 'Mô hình & Dụng cụ thực hành kỹ thuật',
        slug: 'mo-hinh-dung-cu-thuc-hanh-ky-thuat',
      },
    ],
  },
  {
    name: 'Thời trang',
    slug: 'thoi-trang',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/thoi-trang_aylswd.png',
    children: [
      { name: 'Áo thun & Áo sơ mi', slug: 'ao-thun-ao-so-mi' },
      { name: 'Áo khoác, hoodie & Áo len', slug: 'ao-khoac-hoodie-ao-len' },
      { name: 'Quần jean & Quần tây', slug: 'quan-jean-quan-tay' },
      {
        name: 'Quần short, quần thể thao & Legging',
        slug: 'quan-short-quan-the-thao-legging',
      },
      { name: 'Váy & Đầm', slug: 'vay-dam' },
      { name: 'Đồ bộ & Đồ mặc nhà', slug: 'do-bo-do-mac-nha' },
      { name: 'Đồ lót & Đồ ngủ', slug: 'do-lot-do-ngu' },
      {
        name: 'Đồng phục & Trang phục sự kiện',
        slug: 'dong-phuc-trang-phuc-su-kien',
      },
    ],
  },
  {
    name: 'Giày dép',
    slug: 'giay-dep',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/giay-dep_elcszh.png',
    children: [
      {
        name: 'Giày thể thao',
        slug: 'giay-the-thao',
        searchAliases: ['sneaker'],
      },
      { name: 'Giày boot', slug: 'giay-boot' },
      { name: 'Giày da & Giày công sở', slug: 'giay-da-giay-cong-so' },
      { name: 'Sandal & Dép', slug: 'sandal-dep' },
      { name: 'Giày cao gót', slug: 'giay-cao-got' },
      { name: 'Giày trẻ em', slug: 'giay-tre-em' },
      { name: 'Phụ kiện giày', slug: 'phu-kien-giay' },
    ],
  },
  {
    name: 'Túi & Balo',
    slug: 'tui-balo',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/tui-balo_nadsbh.png',
    children: [
      { name: 'Balo', slug: 'balo' },
      { name: 'Túi đựng laptop', slug: 'tui-dung-laptop' },
      { name: 'Túi xách', slug: 'tui-xach' },
      { name: 'Túi đeo chéo & Túi mini', slug: 'tui-deo-cheo-tui-mini' },
      { name: 'Túi tote & Túi vải', slug: 'tui-tote-tui-vai' },
      { name: 'Túi thể thao & Túi gym', slug: 'tui-the-thao-tui-gym' },
      { name: 'Vali & Túi du lịch', slug: 'vali-tui-du-lich' },
      { name: 'Ví', slug: 'vi' },
    ],
  },
  {
    name: 'Đồng hồ & Trang sức',
    slug: 'dong-ho-trang-suc',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/dong-ho-trang-suc_wosk9u.png',
    children: [
      { name: 'Đồng hồ đeo tay', slug: 'dong-ho-deo-tay' },
      { name: 'Nhẫn', slug: 'nhan' },
      { name: 'Dây chuyền & Vòng cổ', slug: 'day-chuyen-vong-co' },
      { name: 'Vòng tay & Lắc tay', slug: 'vong-tay-lac-tay' },
      { name: 'Bông tai & Khuyên', slug: 'bong-tai-khuyen' },
      { name: 'Kính mắt & Kính râm', slug: 'kinh-mat-kinh-ram' },
      { name: 'Mũ, nón & Băng đô', slug: 'mu-non-bang-do' },
      { name: 'Thắt lưng', slug: 'that-lung' },
      { name: 'Khăn choàng & Găng tay', slug: 'khan-choang-gang-tay' },
    ],
  },
  {
    name: 'Mỹ phẩm & Chăm sóc cá nhân',
    slug: 'my-pham-cham-soc-ca-nhan',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/my-pham-cham-soc-ca-nhan_cxekvp.png',
    children: [
      { name: 'Trang điểm mặt', slug: 'trang-diem-mat' },
      { name: 'Trang điểm mắt & môi', slug: 'trang-diem-mat-moi' },
      { name: 'Chăm sóc da mặt', slug: 'cham-soc-da-mat' },
      { name: 'Chăm sóc cơ thể', slug: 'cham-soc-co-the' },
      { name: 'Chăm sóc tóc', slug: 'cham-soc-toc' },
      { name: 'Nước hoa', slug: 'nuoc-hoa' },
      { name: 'Dụng cụ làm đẹp', slug: 'dung-cu-lam-dep' },
      { name: 'Chăm sóc răng miệng', slug: 'cham-soc-rang-mieng' },
    ],
  },
  {
    name: 'Nhà cửa & Đời sống',
    slug: 'nha-cua-doi-song',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/nha-cua-doi-song_oumhvr.png',
    children: [
      { name: 'Nội thất', slug: 'noi-that' },
      { name: 'Đèn & Thiết bị chiếu sáng', slug: 'den-thiet-bi-chieu-sang' },
      { name: 'Đồ gia dụng', slug: 'do-gia-dung' },
      { name: 'Đồ dùng nhà bếp', slug: 'do-dung-nha-bep' },
      { name: 'Bình nước, ly & hộp đựng', slug: 'binh-nuoc-ly-hop-dung' },
      { name: 'Chăn, ga, gối, đệm', slug: 'chan-ga-goi-dem' },
      { name: 'Rèm cửa, thảm & Trang trí', slug: 'rem-cua-tham-trang-tri' },
      { name: 'Cây cảnh & Chậu cây', slug: 'cay-canh-chau-cay' },
      {
        name: 'Dụng cụ dọn dẹp & Vệ sinh nhà cửa',
        slug: 'dung-cu-don-dep-ve-sinh-nha-cua',
      },
    ],
  },
  {
    name: 'Thể thao & Dã ngoại',
    slug: 'the-thao-da-ngoai',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/the-thao-da-ngoai_ulfl9y.png',
    children: [
      {
        name: 'Dụng cụ gym & Tập luyện tại nhà',
        slug: 'dung-cu-gym-tap-luyen-tai-nha',
      },
      {
        name: 'Bóng đá, bóng rổ & Thể thao đồng đội',
        slug: 'bong-da-bong-ro-the-thao-dong-doi',
      },
      { name: 'Cầu lông & Bóng bàn', slug: 'cau-long-bong-ban' },
      { name: 'Yoga & Thể dục', slug: 'yoga-the-duc' },
      { name: 'Dụng cụ bơi lội', slug: 'dung-cu-boi-loi' },
      {
        name: 'Đồ dùng dã ngoại & Cắm trại',
        slug: 'do-dung-da-ngoai-cam-trai',
      },
      { name: 'Ván trượt, patin & Xe trượt', slug: 'van-truot-patin-xe-truot' },
    ],
  },
  {
    name: 'Nhạc cụ & Giải trí',
    slug: 'nhac-cu-giai-tri',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/nhac-cu-giai-tri_jb6iu9.png',
    children: [
      { name: 'Đàn guitar & Ukulele', slug: 'dan-guitar-ukulele' },
      { name: 'Đàn piano & Keyboard', slug: 'dan-piano-keyboard' },
      { name: 'Nhạc cụ khác', slug: 'nhac-cu-khac' },
      { name: 'Đồ chơi & Mô hình', slug: 'do-choi-mo-hinh' },
      { name: 'Boardgame & Thẻ bài', slug: 'boardgame-the-bai' },
      { name: 'Đồ sưu tầm', slug: 'do-suu-tam' },
    ],
  },
  {
    name: 'Xe cộ',
    slug: 'xe-co',
    image: 'https://res.cloudinary.com/dazcuspid/image/upload/xe-co_rhkpcf.png',
    children: [
      { name: 'Xe đạp', slug: 'xe-dap' },
      { name: 'Xe đạp điện & Xe máy điện', slug: 'xe-dap-dien-xe-may-dien' },
      { name: 'Xe máy', slug: 'xe-may' },
      { name: 'Phụ kiện xe đạp', slug: 'phu-kien-xe-dap' },
      { name: 'Phụ kiện xe máy', slug: 'phu-kien-xe-may' },
      { name: 'Mũ bảo hiểm', slug: 'mu-bao-hiem' },
      { name: 'Phụ tùng & Đồ thay thế', slug: 'phu-tung-do-thay-the' },
    ],
  },
  {
    name: 'Thú cưng & Phụ kiện',
    slug: 'thu-cung-phu-kien',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/thu-cung-phu-kien_pnfq4r.png',
    children: [
      { name: 'Thức ăn cho thú cưng', slug: 'thuc-an-cho-thu-cung' },
      {
        name: 'Chuồng, lồng & Phụ kiện thú cưng',
        slug: 'chuong-long-phu-kien-thu-cung',
      },
      { name: 'Đồ chơi cho thú cưng', slug: 'do-choi-cho-thu-cung' },
      { name: 'Cho/Nhận nuôi thú cưng', slug: 'cho-nhan-nuoi-thu-cung' },
    ],
  },
  {
    name: 'Khác',
    slug: 'khac',
    image: 'https://res.cloudinary.com/dazcuspid/image/upload/khac_rfz9jh.png',
    children: [
      { name: 'Vé & Phiếu quà tặng', slug: 've-phieu-qua-tang' },
      { name: 'Đồ khác', slug: 'do-khac' },
    ],
  },
];

// `image` is the homepage category-circle cutout — root categories only.
// Requirements: 1:1 square, transparent PNG, subject centered with margin
// (not edge-to-edge), ≥400×400px. Paste the Cloudinary URL between the quotes.
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
      { name: 'Máy tính bảng', slug: 'may-tinh-bang' },
      { name: 'Máy ảnh & Máy quay phim', slug: 'may-anh-may-quay-phim' },
      { name: 'Tai nghe & Loa', slug: 'tai-nghe-loa' },
      { name: 'Đồng hồ thông minh', slug: 'dong-ho-thong-minh' },
      { name: 'Máy chơi game & Phụ kiện', slug: 'may-choi-game-phu-kien' },
      {
        name: 'Linh kiện & Phụ kiện máy tính',
        slug: 'linh-kien-phu-kien-may-tinh',
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
      { name: 'Giáo trình', slug: 'giao-trinh' },
      { name: 'Sách tham khảo', slug: 'sach-tham-khao' },
      { name: 'Truyện & Văn học', slug: 'truyen-van-hoc' },
      { name: 'Sách ngoại ngữ', slug: 'sach-ngoai-ngu' },
      { name: 'Tạp chí & Ấn phẩm khác', slug: 'tap-chi-an-pham-khac' },
    ],
  },
  {
    name: 'Đồ dùng học tập',
    slug: 'do-dung-hoc-tap',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/do-dung-hoc-tap_ch0px3.png',
    children: [
      { name: 'Văn phòng phẩm', slug: 'van-phong-pham' },
      { name: 'Dụng cụ vẽ', slug: 'dung-cu-ve' },
      { name: 'Máy tính cầm tay', slug: 'may-tinh-cam-tay' },
      {
        name: 'Dụng cụ thí nghiệm & Thực hành',
        slug: 'dung-cu-thi-nghiem-thuc-hanh',
      },
    ],
  },
  {
    name: 'Thời trang',
    slug: 'thoi-trang',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/thoi-trang_aylswd.png',
    children: [
      { name: 'Áo', slug: 'ao' },
      { name: 'Quần', slug: 'quan' },
      { name: 'Váy & Đầm', slug: 'vay-dam' },
      { name: 'Đồ thể thao', slug: 'do-the-thao' },
      { name: 'Đồ mặc nhà & Đồ lót', slug: 'do-mac-nha-do-lot' },
    ],
  },
  {
    name: 'Giày dép',
    slug: 'giay-dep',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/giay-dep_elcszh.png',
    children: [
      { name: 'Giày thể thao', slug: 'giay-the-thao' },
      { name: 'Giày da & Giày công sở', slug: 'giay-da-giay-cong-so' },
      { name: 'Sandal & Dép', slug: 'sandal-dep' },
      { name: 'Giày cao gót', slug: 'giay-cao-got' },
      { name: 'Giày trẻ em', slug: 'giay-tre-em' },
      { name: 'Giày khác', slug: 'giay-khac' },
    ],
  },
  {
    name: 'Túi & Balo',
    slug: 'tui-balo',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/tui-balo_nadsbh.png',
    children: [
      { name: 'Balo', slug: 'balo' },
      { name: 'Balo, túi đựng laptop', slug: 'balo-tui-dung-laptop' },
      { name: 'Túi xách', slug: 'tui-xach' },
      { name: 'Túi đeo chéo', slug: 'tui-deo-cheo' },
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
      { name: 'Trang sức', slug: 'trang-suc' },
      { name: 'Kính mắt', slug: 'kinh-mat' },
      { name: 'Phụ kiện thời trang khác', slug: 'phu-kien-thoi-trang-khac' },
    ],
  },
  {
    name: 'Mỹ phẩm & Chăm sóc cá nhân',
    slug: 'my-pham-cham-soc-ca-nhan',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/my-pham-cham-soc-ca-nhan_cxekvp.png',
    children: [
      { name: 'Trang điểm', slug: 'trang-diem' },
      { name: 'Chăm sóc da', slug: 'cham-soc-da' },
      { name: 'Chăm sóc tóc', slug: 'cham-soc-toc' },
      { name: 'Nước hoa', slug: 'nuoc-hoa' },
      { name: 'Dụng cụ làm đẹp', slug: 'dung-cu-lam-dep' },
    ],
  },
  {
    name: 'Nhà cửa & Đời sống',
    slug: 'nha-cua-doi-song',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/nha-cua-doi-song_oumhvr.png',
    children: [
      { name: 'Nội thất', slug: 'noi-that' },
      { name: 'Bình nước, ly & hộp đựng', slug: 'binh-nuoc-ly-hop-dung' },
      { name: 'Đồ gia dụng', slug: 'do-gia-dung' },
      { name: 'Đồ dùng nhà bếp', slug: 'do-dung-nha-bep' },
      { name: 'Chăn, ga, gối, đệm', slug: 'chan-ga-goi-dem' },
      { name: 'Trang trí', slug: 'trang-tri' },
      { name: 'Cây cảnh', slug: 'cay-canh' },
    ],
  },
  {
    name: 'Thể thao & Dã ngoại',
    slug: 'the-thao-da-ngoai',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/the-thao-da-ngoai_ulfl9y.png',
    children: [
      { name: 'Dụng cụ thể thao', slug: 'dung-cu-the-thao' },
      {
        name: 'Đồ dùng dã ngoại & Cắm trại',
        slug: 'do-dung-da-ngoai-cam-trai',
      },
      { name: 'Dụng cụ bơi lội', slug: 'dung-cu-boi-loi' },
    ],
  },
  {
    name: 'Nhạc cụ & Giải trí',
    slug: 'nhac-cu-giai-tri',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/nhac-cu-giai-tri_jb6iu9.png',
    children: [
      { name: 'Nhạc cụ', slug: 'nhac-cu' },
      { name: 'Đồ chơi & Mô hình', slug: 'do-choi-mo-hinh' },
      { name: 'Đồ sưu tầm', slug: 'do-suu-tam' },
      { name: 'Boardgame & Thẻ bài', slug: 'boardgame-the-bai' },
    ],
  },
  {
    name: 'Xe cộ',
    slug: 'xe-co',
    image: 'https://res.cloudinary.com/dazcuspid/image/upload/xe-co_rhkpcf.png',
    children: [
      { name: 'Xe đạp', slug: 'xe-dap' },
      { name: 'Xe máy', slug: 'xe-may' },
      { name: 'Phụ kiện xe đạp', slug: 'phu-kien-xe-dap' },
      { name: 'Phụ kiện xe máy', slug: 'phu-kien-xe-may' },
      { name: 'Mũ bảo hiểm', slug: 'mu-bao-hiem' },
    ],
  },
  {
    name: 'Thú cưng & Phụ kiện',
    slug: 'thu-cung-phu-kien',
    image:
      'https://res.cloudinary.com/dazcuspid/image/upload/thu-cung-phu-kien_pnfq4r.png',
    children: [
      {
        name: 'Phụ kiện & Thức ăn cho thú cưng',
        slug: 'phu-kien-thuc-an-thu-cung',
      },
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

# Thesis Novelty — VN-CondScore

> ⚠️ Trạng thái: Ý tưởng đang phát triển, đã gửi email xin ý kiến GVHD (thầy Trình Trọng Tín), chưa có phản hồi chính thức. Thay thế hoàn toàn hướng cũ (Community-Anchored Trust & Recommendation, PageRank, University model — đã bỏ, xem lý do ở cuối file).

## Tên tạm đặt

**VN-CondScore** — hệ thống đánh giá độ tin cậy về tình trạng sản phẩm đồ cũ, dựa trên LLM kết hợp truy xuất (Retrieval-Augmented Generation).

## Vấn đề giải quyết

Trong C2C đồ cũ, buyer không thể kiểm tra vật lý sản phẩm trước khi quyết định có đáng bỏ công đi gặp xem hàng hay không — tin đăng (ảnh + mô tả) là nguồn thông tin duy nhất tại thời điểm đó. Đây là bất cân xứng thông tin thật sự của mô hình C2C đồ cũ (được xác nhận qua khảo sát tài liệu — xem phần Công trình liên quan), khác với rủi ro tài chính buyer-seller (đã được giải quyết tự nhiên nhờ đặc thù gặp mặt trực tiếp của sinh viên, xem AGENTS.md → Money Flow).

Công thức Quality Score hiện tại của Fleazo chỉ đếm số lượng (`min(ảnh/5,1)×15`, `min(độ_dài_mô_tả/200,1)×10`) — không đánh giá được **chất lượng thông tin thật sự** của tin đăng.

## Cơ chế hoạt động — 2 bước

### Bước 1 — Truy xuất (Retrieval)

Khi có 1 tin đăng mới cần chấm điểm, hệ thống tìm trong cơ sở dữ liệu những tin đăng **cùng danh mục đã kết thúc vòng đời** (`SOLD` hoặc `EXPIRED`) — tức đã có kết quả thật — lấy ra vài tin gần nhất làm ngữ cảnh tham chiếu.

**Ví dụ:** Tin mới "Laptop Dell Vostro" (mô tả sơ sài "còn xài tốt, giá rẻ", 2 ảnh mờ) → hệ thống truy xuất được 3 tin cùng category Laptop: 2 tin đã `SOLD` (mô tả chi tiết tình trạng, ảnh đủ góc rõ nét), 1 tin đã `EXPIRED` (mô tả sơ sài, ảnh mờ — giống tin mới).

### Bước 2 — Sinh điểm số có tham chiếu (RAG)

Tin đăng mới cùng các tin tham chiếu được đưa vào 1 LLM đa phương thức (đọc hiểu cả ảnh lẫn văn bản) để so sánh, LLM trả về:

1. Điểm số thể hiện mức độ tin đăng đã truyền tải đủ thông tin về tình trạng thực của sản phẩm
2. Danh sách thông tin quan trọng còn thiếu, gợi ý ngược lại cho seller bổ sung trước khi đăng (ví dụ: "chưa nêu thời gian sử dụng", "chưa nêu tình trạng pin", "cần chụp thêm ảnh góc rõ hơn")

Điểm khác biệt so với việc chỉ gọi LLM chấm điểm trực tiếp: LLM chấm có **căn cứ so sánh với các trường hợp thật đã biết kết quả**, không chấm điểm độc lập không tham chiếu.

## Kế hoạch thực nghiệm (benchmark)

Thu thập ~100-200 tin đăng đã có kết quả thật (đã bán/đã hết hạn), chạy song song 2 cách chấm điểm trên cùng tập dữ liệu:

- Công thức hiện tại (đếm số lượng ảnh/độ dài mô tả)
- Phương pháp đề xuất (Retrieval + LLM)

Đo chỉ số **AUC** (khả năng phân biệt tin bán được vs tin ế) cho cả 2 cách, so sánh trực tiếp — nếu AUC của phương pháp mới cao hơn rõ rệt, đây là bằng chứng định lượng cho novelty.

### Vấn đề dữ liệu — đã xác định, chưa giải quyết dứt điểm

Fleazo chưa có user thật → chưa có tin đăng có kết quả thật để benchmark. **Không thể tự tạo tin đăng rồi tự gán nhãn kết quả** — dẫn tới lập luận vòng tròn (circular reasoning): người tạo dữ liệu và người quyết định nhãn "tốt/xấu" là cùng 1 người, benchmark sẽ tự động đẹp mà không chứng minh được gì.

**2 hướng đang cân nhắc:**

1. Thu thập dữ liệu thật từ 1 sàn C2C đồ cũ đã có sẵn (Chợ Tốt) — dùng trạng thái tin đăng thật (còn hiển thị / đã gỡ) làm nhãn khách quan
2. Nhờ 1 nhóm người ngoài (không phải Huy) độc lập chấm điểm 1 tập tin đăng, không biết trước điểm LLM chấm, dùng điểm trung bình làm căn cứ đối chiếu

→ Đã gửi email xin ý kiến GVHD về hướng giải quyết này, đang chờ phản hồi.

## Công trình liên quan gần nhất

- **Mercari Image Score** (sàn C2C đồ cũ lớn nhất Nhật) — dùng LLM chấm điểm ảnh cho đúng bối cảnh C2C đồ cũ, nhưng **chỉ xử lý ảnh**, không xử lý mô tả text, tiếng Nhật
- **LLM cascade cho product quality assessment** (arxiv 2510.23941, 10/2025) — dùng LLM đánh giá catalog B2C hàng mới, không phải secondhand
- **Aug2Search (Facebook Marketplace)** — LLM-as-judge đánh giá dữ liệu tổng hợp để cải thiện search, không phải chấm tin đăng gốc
- **Chưa tìm thấy công trình nào** kết hợp cả ảnh và mô tả **tiếng Việt** thành 1 điểm đánh giá tình trạng, dùng cơ chế **retrieval tham chiếu tin đã có kết quả thật**, cho đúng bối cảnh C2C đồ cũ

(Khảo sát đầy đủ hơn, có link, theo từng vòng tìm kiếm — xem Google Doc "Fleazo — Khảo sát tài liệu & Định hướng Novelty")

## Lý do bỏ hướng cũ (Community-Anchored Trust & Recommendation)

Hướng cũ dùng Personalized PageRank lan truyền tin cậy qua đồ thị Review/Message, neo bằng xác thực trường đại học — bị bỏ vì:

1. Vấn đề "trust tài chính buyer-seller" mà hướng đó nhắm giải quyết **đã được giải quyết tự nhiên** nhờ mô hình gặp mặt trực tiếp của Fleazo — không cần thuật toán phức tạp cho 1 rủi ro không tồn tại đáng kể
2. Xác thực trường đại học (email/thẻ SV) gây friction cao cho user, tốn công admin duyệt, trong khi giá trị mang lại thấp
3. Đồ thị Review/Message sẽ quá thưa (sparse) ở giai đoạn đầu, PageRank không có ý nghĩa thống kê

## Việc cần làm tiếp theo

- [ ] Chờ phản hồi GVHD về hướng đề tài + cách giải quyết vấn đề dữ liệu
- [ ] Nếu được duyệt: thiết kế cụ thể prompt cho LLM (tiêu chí chấm điểm, format output)
- [ ] Thử nghiệm crawl dữ liệu Chợ Tốt (kiểm tra tính khả thi/pháp lý trước)
- [ ] Xây baseline (công thức đếm số lượng) để so sánh

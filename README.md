# Sử Đảng · Góc ôn tập

Website học Lịch sử Đảng bằng thẻ ghi nhớ, trắc nghiệm có giải thích và thi thử.

## GitHub Pages

Chọn Settings → Pages → Deploy from a branch → main → /(root) → Save.

## Mở website

Mở `index.html` trực tiếp trong trình duyệt. Không cần cài thư viện hoặc tạo tài khoản.

Để chạy bằng địa chỉ cục bộ, mở thư mục này rồi chạy:

```text
python -m http.server 4190 --bind 127.0.0.1
```

Sau đó mở `http://127.0.0.1:4190/`.

## Tính năng

- Lật thẻ câu hỏi / đáp án và giải thích; đánh dấu đã nhớ hoặc cần ôn.
- Luyện tập 10, 20, 40 hoặc toàn bộ câu trong bộ lọc.
- Đảo câu hỏi và đáp án mặc định. Đáp án đúng gắn với mã lựa chọn gốc, không gắn với vị trí A/B/C/D trên màn hình.
- Thi thử có đồng hồ; tự chấm và nộp khi hết giờ. Khi tạm dừng bài thi, đồng hồ vẫn chạy theo thời gian bắt đầu.
- Xem lại từng câu, ôn riêng câu sai / bỏ trống, làm lại với đáp án được đảo.
- Tìm kiếm có dấu hoặc không dấu; lọc chương, phần, đã nhớ, cần ôn và đã lưu.
- Tự lưu tiến độ, câu đã lưu và bài đang làm trên trình duyệt hiện tại.
- Phím Space lật thẻ, ←/→ đổi thẻ, 1–4 chọn đáp án, Enter tiếp tục.
- Tải toàn bộ câu hỏi dưới dạng JSON từ thư viện.

Tiến độ lưu trên từng trình duyệt và địa chỉ website. Chuyển thiết bị, đổi địa chỉ hoặc xóa dữ liệu trình duyệt sẽ không mang theo tiến độ. Chế độ mở file trực tiếp có thể hạn chế lưu dữ liệu trên một số trình duyệt; dùng máy chủ cục bộ khi cần.

## Nguồn dữ liệu

Nguồn: https://github.com/nhulsd-creator/ontaptthcm-lsd

Trang gốc: https://nhulsd-creator.github.io/ontaptthcm-lsd/

Lấy dữ liệu ngày 06/11/2026 từ `index.html` của commit `37aace003f06a10a8746ecd7be02e565dd352382`.

SHA của file gốc: `7e41b4650c1799af092d25f3a974adf4175abfe9`.

| Phần | Số câu |
|---|---:|
| Chương mở đầu | 43 |
| Chương 1 · Phần I | 147 |
| Chương 1 · Phần II | 158 |
| Chương 2 · Phần I | 143 |
| Chương 2 · Phần II | 136 |
| Chương 3 · Phần I | 45 |
| Chương 3 · Phần II | 121 |
| Tổng cộng | 793 |

Giữ nguyên nội dung câu hỏi, bốn lựa chọn, chỉ số đáp án và giải thích từ nguồn. Mỗi câu có mã gốc riêng. Website phản ánh đáp án của bộ đề, chưa đối chiếu học thuật từng câu. Dữ liệu chỉ gồm môn Lịch sử Đảng của trang đã cung cấp.

## Kiểm tra

```text
npm test
```

Bộ kiểm tra đối chiếu 793 câu, phân bố chương, toàn vẹn lựa chọn, 50 lần đảo cho từng câu (39.650 trường hợp), cách tính điểm và tìm kiếm tiếng Việt.

Website dùng HTML/CSS/JavaScript thuần, không cần máy chủ dữ liệu. Không gửi tiến độ học hoặc thông tin cá nhân về trang nguồn.

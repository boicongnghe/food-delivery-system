# Voucher của quán

Tài liệu nghiệp vụ cho nhóm. Khác với **mã của nền tảng** (`promotion_rules`, admin tạo ở UC41, nền tảng chịu tiền): voucher của quán do **chủ quán tự tạo** để chạy chương trình riêng, và **quán tự chịu** tiền giảm.

Màn hình chủ quán: **Khuyến Mãi** (`/restaurant/vouchers`).

## 1. Quy tắc của một mã

| Trường | Quy tắc |
| --- | --- |
| Mã | 4–20 chữ cái/chữ số, không dấu, tự viết hoa, không trùng trong cùng quán |
| Tên chương trình | 3–60 ký tự (VD "Mừng khai trương") |
| Kiểu giảm | **Số tiền** (1.000–1.000.000đ) hoặc **%** (1–100%) |
| Giảm tối đa | **Bắt buộc với mã %** (1.000–1.000.000đ), để một đơn lớn không làm quán lỗ nặng |
| Đơn tối thiểu | Tính trên tiền món. Với mã giảm số tiền, đơn tối thiểu phải **≥ số tiền giảm** (không cho ra món miễn phí) |
| Thời gian | Bắt đầu – kết thúc; thời gian kết thúc phải sau thời gian bắt đầu và sau hiện tại |
| Tổng lượt dùng | Để trống = không giới hạn. Đây là ngân sách khuyến mãi của quán. Khi sửa, không được nhỏ hơn số lượt đã dùng |
| Lượt mỗi khách | 1–10, mặc định 1 |
| Bật / tạm dừng | Chủ quán bật/tắt bất cứ lúc nào |

**Trạng thái hiển thị:** Đang chạy · Sắp diễn ra · Hết lượt · Tạm dừng · Đã kết thúc.

- Mã **đã có đơn dùng** thì không xóa được (để giữ lịch sử đơn), chỉ tạm dừng hoặc kết thúc được. Mã chưa dùng thì xóa được.
- Sửa mã không làm thay đổi các đơn đã đặt, vì mỗi đơn lưu bản sao mã và số tiền giảm của nó.
- Quán bị tạm ngưng (`suspended`) vẫn xem được danh sách mã nhưng không tạo/sửa được.

## 2. Khách dùng mã

- Ở trang thanh toán có mục **"Voucher của quán"** liệt kê các mã đang chạy của quán. Mã chưa đủ đơn tối thiểu hiện mờ.
- **Mỗi đơn: tối đa 1 mã quán + 1 mã nền tảng.** Mã quán trừ trước; mã nền tảng tính trên phần tiền món còn lại (cả điều kiện đơn tối thiểu lẫn %).
  - Ví dụ: tiền món 200.000đ, mã quán −20.000đ, mã nền tảng 10% → 10% × 180.000đ = −18.000đ.
- Server kiểm tra lại mọi điều kiện **lúc tạo đơn** (bản xem trước ở trang thanh toán chỉ để hiển thị).

**Lượt dùng** = số đơn thật có mã (không tính đơn đã hủy, không tính đơn chuyển khoản chưa thanh toán). Vì vậy:
- Đơn bị hủy (do khách, quán, hệ thống hay admin) thì lượt được trả lại, không cần sửa luồng hủy nào.
- Đơn chuyển khoản bỏ dở không chiếm lượt.
- Đánh đổi chấp nhận được: nhiều đơn đặt trong cùng một giây có thể vượt tổng lượt thêm 1–2 lượt.

## 3. Tiền

Quán chịu **toàn bộ** voucher quán; nền tảng **không tính hoa hồng** trên phần quán đã giảm (decision của nhóm, giống GrabFood):

```
Phí nền tảng = (tiền món − voucher quán) × tỉ lệ hoa hồng của ngày đặt đơn
Thực nhận    = tiền món + phí đóng gói − voucher quán − phí nền tảng
```

Ví dụ: tiền món 200.000đ, đóng gói 10.000đ, voucher quán 20.000đ, hoa hồng 10% → phí nền tảng 18.000đ, thực nhận 172.000đ.

- Mã nền tảng vẫn do nền tảng chịu, không trừ vào quán.
- Công thức này áp dụng giống nhau ở ví, sao kê (tab Chi tiết hoa hồng), lịch sử đơn, file CSV và thống kê hoa hồng của admin.
- Trang Khuyến Mãi hiện **"Quán đã chịu"**, tức tổng voucher quán của các đơn đã giao.

## 4. Hiển thị cho khách

- Thẻ quán ở trang chủ hiện voucher đang chạy dễ đạt nhất (đơn tối thiểu thấp nhất), ví dụ "Giảm 20K đơn từ 100K". Quán không có voucher thì không hiện dòng khuyến mãi. Trước đây dòng này ghi cứng "Freeship đơn từ 99k" cho mọi quán.
- Bảng bếp tách 2 dòng: "Voucher quán (MÃ)" và "Voucher nền tảng".

## 5. API

| Method | Endpoint | Ghi chú |
| --- | --- | --- |
| GET | `/api/restaurants/me/vouchers` | Chủ quán: `{ items (kèm used, spent, status, label), summary }` |
| POST | `/api/restaurants/me/vouchers` | Tạo mã |
| PUT | `/api/restaurants/me/vouchers/:id` | Sửa mã (gửi đủ form) |
| PATCH | `/api/restaurants/me/vouchers/:id/active` | `{ isActive }`: bật / tạm dừng |
| DELETE | `/api/restaurants/me/vouchers/:id` | Chỉ mã chưa có đơn dùng (409 nếu đã dùng) |
| GET | `/api/restaurant-vouchers?restaurantId=` | Công khai: mã đang chạy, còn lượt của quán (`restaurantId` có thể là id, slug `res-...` hoặc tên quán) |
| POST | `/api/restaurant-vouchers/apply` | Khách đăng nhập: `{ restaurantId, code, subtotal }` → `{ code, title, discountAmount }` (kiểm tra cả lượt của chính khách) |
| POST | `/api/orders` | Thêm `restaurantVoucherCode` (tùy chọn) bên cạnh `promotionCode` |

## 6. Dữ liệu

- Collection `restaurant_vouchers` (`RestaurantVoucher.js`): `restaurant`, `code` (unique theo quán), `title`, `discountType`, `discountValue`, `maxDiscount`, `minOrderValue`, `startAt`, `endAt`, `usageLimit`, `perCustomerLimit`, `isActive`.
- `orders.restaurantVoucher`: `{ voucher, code, discountAmount }` (bản sao lúc đặt). `orders.discount` = voucher quán + voucher nền tảng (tổng khách được giảm); `orders.promotion.discountAmount` = phần của nền tảng.

## 7. Chưa làm (đề xuất bước sau)

- Voucher chỉ áp dụng cho một số món / danh mục, hoặc giảm phí giao hàng (freeship do quán tài trợ).
- Voucher dành riêng khách mới / khách quen, hoặc mã tặng riêng từng khách.
- Admin xem và tạm khóa voucher của quán khi có gian lận.
- Giới hạn ngân sách theo tiền (ví dụ tối đa 2.000.000đ/chương trình) thay vì theo số lượt.

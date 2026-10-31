# Báo cáo doanh thu & thống kê của chủ quán

Trang `/restaurant/revenue` (menu **Thống Kê** của cổng chủ quán). Có 4 tab: Tổng quan, Lịch sử đơn hàng, Đánh giá khách hàng, Chi tiết hoa hồng. Chỉ đọc dữ liệu; quán ở mọi trạng thái (kể cả bị tạm ngưng) đều xem được để đối soát tiền.

## Quy tắc tính tiền

Dùng **cùng quy tắc với báo cáo admin (UC44)** để hai bên luôn ra cùng một con số (phí nền tảng của quán = cột hoa hồng của quán trong báo cáo admin).

| Khái niệm | Cách tính |
| --- | --- |
| Đơn thuộc ngày nào | Ngày **đặt đơn** theo giờ Việt Nam (UTC+7) |
| Đơn được tính | Bỏ qua đơn online chưa từng thanh toán, kể cả khi khách đã hủy ở trang thanh toán (quán chưa từng thấy đơn). Cùng bộ lọc `PLACED_ORDER_FILTER` với báo cáo admin nên số đơn và số đơn hủy hai bên khớp nhau |
| Doanh thu gộp | `subtotal + packagingFee` của đơn **đã giao** (`delivered`). Không gồm phí giao hàng (thuộc shipper) |
| Tiền món / Topping | Topping = tổng giá option × số lượng; tiền món = `subtotal` − topping |
| Phí nền tảng | `round(subtotal × tỉ lệ hoa hồng của ngày đó / 100)`, làm tròn **một lần mỗi ngày**. Phí đóng gói không tính hoa hồng |
| Tỉ lệ hoa hồng | Quy tắc `CommissionRule` (target `restaurant`) đang hiệu lực ngày đặt đơn: quy tắc riêng của quán ưu tiên hơn quy tắc mặc định; không có quy tắc → 0% |
| Voucher quán | Luôn 0đ: voucher hiện do nền tảng tài trợ (`PromotionRule` chưa có trường quán) nên quán nhận đủ tiền món |
| Thực nhận | Doanh thu gộp − phí nền tảng − voucher quán |
| Bồi thường khiếu nại | Nền tảng chi trả, chỉ hiển thị để tham khảo, **không** trừ vào tiền quyết toán |

Phí nền tảng hiển thị trên từng đơn (tab Lịch sử đơn hàng, file CSV) là **ước tính**; số quyết toán chính thức là số làm tròn theo ngày ở tab Chi tiết hoa hồng (chênh lệch tối đa vài đồng).

## Phân loại đơn

| Tab | Điều kiện |
| --- | --- |
| Hoàn thành | `status = delivered` |
| Đang xử lý | `pending`, `confirmed`, `preparing`, `ready_for_pickup`, `delivering` |
| Khách / hệ thống hủy | `cancelled` và `cancellation.by ≠ restaurant` |
| Quán từ chối | `cancelled` và `cancellation.by = restaurant` (tính vào tỉ lệ từ chối của quán) |

## Quyết toán (mô phỏng, chưa có cổng thanh toán)

- Chu kỳ theo tuần **Thứ Hai – Chủ Nhật** (giờ Việt Nam), chuyển khoản vào **Thứ Hai tuần sau**.
- Hôm nay ≥ ngày chuyển khoản → **Đã quyết toán**, ngược lại → **Chờ chuyển khoản**.
- Ví dụ: đơn đặt 23:30 Chủ Nhật 25/10 thuộc chu kỳ 19/10–25/10, chuyển khoản 26/10; đơn đặt 00:30 Thứ Hai 26/10 thuộc chu kỳ 26/10–01/11.
- Chu kỳ có một phần nằm ngoài khoảng ngày đang xem được đánh dấu "một phần" – tổng của nó trên màn hình không phải toàn bộ số tiền chuyển khoản.

## Tài khoản nhận tiền

Chủ quán khai báo ở **Hồ sơ quán** (`payoutAccount`: `bankName`, `accountNumber` 6–20 chữ số, `accountHolder` viết hoa). Nhập đủ cả ba hoặc để trống cả ba. Gửi `PUT /api/restaurants/me` không kèm `payoutAccount` thì giữ nguyên tài khoản cũ. Báo cáo và bản in chỉ hiện số tài khoản đã che (`**** 4455`).

## Quyền riêng tư

- Số điện thoại khách luôn bị che (`090***456`).
- Đánh giá chỉ hiện tên rút gọn (`Nguyễn Văn Tuấn` → `Tuấn N.`), không có id/email/SĐT khách. Đánh giá bị admin ẩn không hiện và không tính điểm, chỉ báo số lượng.
- Chủ quán chỉ xem được dữ liệu quán của mình (quán lấy theo tài khoản đăng nhập, không nhận id quán từ client).

## API

Tất cả: `GET`, cần `Authorization: Bearer <jwt>` của `restaurant_owner`. Tham số chung `from`, `to` dạng `YYYY-MM-DD` (ngày Việt Nam, tính cả hai đầu, `from ≤ to ≤ hôm nay`, tối đa 366 ngày).

| Endpoint | Tham số thêm | Trả về |
| --- | --- | --- |
| `/api/restaurants/me/reports/overview` | – | `summary`, `previous` (kỳ liền trước cùng độ dài), `range.series` (theo ngày; > 62 ngày thì theo tháng), `peakHours`, `topDishes`, `recentOrders`, `reviews`, `complaints`, `currentCycle`, `payoutAccount` |
| `/api/restaurants/me/reports/orders` | `status` (`all`, `delivered`, `in_progress`, `cancelled`, `rejected`), `keyword` (mã đơn / tên khách), `page`, `limit` | `{ items, pagination, counts }` |
| `/api/restaurants/me/reports/orders/export` | như trên, không phân trang | `{ items, truncated, limit }` (tối đa 5000 đơn) |
| `/api/restaurants/me/reports/reviews` | `rating` (1–5), `page`, `limit` | `{ items, pagination, summary }` |
| `/api/restaurants/me/reports/settlements` | – | `{ payoutAccount, totals, cycles, days }` |

## Xuất file & in

- Nút **Xuất ... (CSV)** xuất dữ liệu của tab đang mở (Tổng quan: theo kỳ; Lịch sử đơn: theo bộ lọc hiện tại; Chi tiết hoa hồng: theo ngày). File UTF-8 có BOM, mở bằng Excel không lỗi tiếng Việt.
- Nút **In sao kê** in bảng quyết toán khổ A4 (phiếu bếp vẫn in khổ 80mm).

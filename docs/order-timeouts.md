# Thời hạn xử lý đơn (R20, R08)

Bộ rule do BA chốt sau khi benchmark ShopeeFood, GrabFood và SePay. Mã `TO-xx` là mã tạm; BA đánh lại theo số trong SRS.

**Nguyên tắc phân vai:** bước nào chưa ai tốn chi phí thì hệ thống tự xử lý (nhắc, tự hủy). Bước nào đã phát sinh chi phí (món đã nấu, tiền bị lệch) thì chuyển cho admin.

## Bộ rule và trạng thái triển khai

| ID | Tình huống | Hành động | Ai xử lý | Tiền | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| TO-01 | Khách chưa chuyển khoản sau `payTimeout` | Đơn hết hạn thanh toán, QR hết hiệu lực | Hệ thống | Không có | Module thanh toán |
| TO-02 | Quán chưa nhận đơn sau `acceptRemind` | Nhắc quán: thông báo, chuông và đếm ngược trên bảng bếp | Hệ thống | – | **Đã làm** |
| TO-03 | Quán chưa nhận đơn sau `acceptTimeout` | Tự hủy, báo khách và quán, tính vào tỉ lệ từ chối của quán | Hệ thống | Hoàn 100% (tạo yêu cầu hoàn tiền) | **Đã làm** |
| TO-04 | Quán nấu quá `prepTime` đã khai báo | Cảnh báo quán, báo khách món sẽ chậm | Hệ thống | – | **Đã làm** |
| TO-05 | Quá `prepTime + prepGrace` | Không tự hủy. Chuyển cho admin (tab "Cần xử lý"); admin hủy thay khách nếu cần (D3) | Admin | Nếu hủy: hoàn khách 100%, quán không được bù | **Đã làm** |
| TO-06 | Chưa có shipper sau `shipperRemind` (tính từ lúc quán nhận đơn) | Báo admin để điều phối | Admin | – | **Đã làm** |
| TO-07 | Chưa có shipper sau `shipperTimeout` (tính từ lúc quán nhận đơn) | Tự hủy, báo khách và quán, không tính lỗi cho quán. Bếp chưa nấu nên quán không mất món | Hệ thống | Hoàn khách 100%; bù cho quán ngoài phạm vi (D2) | **Đã làm** |
| TO-08 | Shipper đã đến quán nhưng chờ quá `pickupWait` | Shipper báo cáo và hủy, không bị tính lỗi | Admin | Hoàn khách 100%, quán không được bù | Module shipper (cần thêm bước "đã đến quán") |
| TO-08b | Shipper đã nhận đơn nhưng quá `pickupWait` vẫn chưa lấy hàng | Không tự động. Báo admin (tab "Cần xử lý"); admin liên hệ shipper, **đổi shipper** (trả đơn về hàng chờ) hoặc hủy thay khách | Admin | Nếu hủy: hoàn khách 100% | **Đã làm** |
| TO-09 | Quán chưa khai báo lịch | Lịch rỗng hoặc lỗi = đóng cửa; không hiện trên trang chủ; admin không duyệt được | Hệ thống | – | **Đã làm** |
| TO-10 | Sát giờ đóng cửa | Ngừng nhận đơn `closingCutoff` phút trước giờ đóng của ca hiện tại | Hệ thống | – | **Đã làm** lúc tạo đơn và ước tính phí ship; kiểm tra lại lúc xác nhận thanh toán thuộc module thanh toán |
| TO-11 | Tiền về khi đơn đã hết hạn thanh toán | Không tạo đơn cho quán; ghi "Thanh toán muộn – chờ hoàn" | Admin, trong `refundSlaHours` | Hoàn 100% | Module thanh toán |
| TO-12 | Tiền về đúng hạn nhưng quán đã đóng hoặc tạm ngưng | Không đẩy đơn cho quán, xử lý như TO-11 | Admin | Hoàn 100% | Module thanh toán |
| TO-13 | Chuyển thiếu tiền | Không xác nhận đơn, ghi "Lệch số tiền" | Admin | Hoàn số đã nhận | Module thanh toán |
| TO-14 | Chuyển thừa tiền | Xác nhận đơn, ghi nhận phần dư | Admin | Hoàn phần thừa | Module thanh toán |
| TO-15 | Giao dịch không có hoặc sai mã đơn | Đưa vào "Giao dịch chưa khớp" để đối soát | Admin | Hoàn sau khi xác minh | Module thanh toán |
| TO-16 | Webhook bị mất hoặc trùng | Chống trùng theo id giao dịch; cron đối soát mỗi `reconInterval` | Hệ thống | – | Module thanh toán (làm cùng R01) |

Hoàn tiền dùng luồng có sẵn (R06, xem [database.md](database.md)): hủy đơn đã trả tiền → `refund.status = pending` → admin chuyển trả rồi xác nhận kèm mã giao dịch. Luồng này hỗ trợ số tiền bất kỳ, dùng được cho TO-13 và TO-14.

## Tham số (Assumptions của SRS)

Admin sửa ở **Cấu hình vận hành** (`/admin/settings`). Lưu trong collection `platform_settings`, document `_id: "order-timeouts"`; chưa lưu lần nào thì dùng giá trị mặc định.

| Tham số | Mặc định | Căn cứ | Đang dùng |
| --- | --- | --- | --- |
| `payTimeout` | 15 phút | Giả định: đủ thời gian để khách mở app ngân hàng | Chờ module thanh toán |
| `acceptRemind` / `acceptTimeout` | 2 / 5 phút | Giả định; ShopeeFood có mốc này nhưng không công bố số | Có |
| `prepTime` (quán khai báo) / `defaultPrepTime` | 15 phút | Ngưỡng 15 phút của Grab | Có |
| `prepGrace` | 15 phút | Giả định | Có |
| `shipperRemind` / `shipperTimeout` | 10 / 20 phút | ShopeeFood hủy ở mốc 20 phút | Có |
| `pickupWait` | 30 phút | Ngưỡng hỗ trợ tài xế của Grab | Có (TO-08b); TO-08 chờ module shipper |
| `closingCutoff` | 30 phút | Giả định, nên ≥ thời gian chuẩn bị tối đa | Có |
| `reconInterval` | 15 phút | SePay khuyến nghị 15–30 phút | Chờ module thanh toán |
| `refundSlaHours` | 24 giờ | Giả định | Chờ module thanh toán |

Ràng buộc khi lưu: `acceptTimeout > acceptRemind` và `shipperTimeout > shipperRemind`.

## Decision log

| # | Quyết định | Lý do / phương án đã loại |
| --- | --- | --- |
| D1 | **Không hỗ trợ khung giờ qua đêm** (ví dụ 18:00–02:00), giống Grab. Mỗi ca phải có giờ đóng sau giờ mở trong cùng ngày; quán mở qua đêm khai báo 2 ca ở 2 ngày | Đơn giản, khớp validation sẵn có. Đã bỏ nhánh xử lý qua đêm còn sót trong hàm kiểm tra giờ mở ở client và server |
| D2 | **Bù cho quán ở TO-07 nằm ngoài phạm vi đồ án**, xử lý thủ công. Hệ thống chỉ báo cho quán liên hệ admin | Bù là chi phí nền tảng chịu và cần quy trình duyệt riêng |
| D3 | **TO-05: admin hủy thay khách** từ danh sách "Cần xử lý" (`PATCH /api/admin/orders/:id/cancel`), không làm luồng "khách gửi yêu cầu hủy" | Tiết kiệm 1–2 ngày công; khách liên hệ hỗ trợ |
| D4 | TO-08 thuộc module shipper; TO-01, TO-11 → TO-16 và phần kiểm tra lại TO-10 lúc xác nhận thanh toán thuộc module thanh toán, làm cùng R01 | Cùng sửa đúng những đoạn code đó |
| D5 | **Không hồi sinh đơn khi tiền về muộn** (TO-11) | Tránh quán nhận đơn ngoài giờ; khách chờ hoàn tiền thủ công. Đã loại phương án tự tạo lại đơn nếu quán còn mở |

## Cách hệ thống chạy

- `services/orderTimeoutService.js` chạy mỗi phút trong tiến trình server (`startOrderTimeoutJobs` trong `server.js`), theo thứ tự TO-02 → TO-07 rồi TO-08b. Bước nhắc luôn chạy trước bước tự động mà nó báo trước.
- Luồng mới ([order-flow.md](order-flow.md)): bếp chỉ nấu khi shipper đã nhận đơn, nên TO-06/TO-07 tính từ `acceptedAt` của đơn `confirmed`. TO-04/TO-05 tính từ `kitchenDueAt`, được đặt lúc shipper nhận đơn.
- Đơn shipper tự trả hoặc admin trả về hàng chờ (đổi shipper) ghi `timeouts.releasedAt`: TO-06 và TO-07 tính lại từ mốc này, để đơn không bị tự hủy ngay sau khi đổi shipper. Đơn cũ `ready_for_pickup` chưa có shipper vẫn tính từ `readyAt`.
- Cảnh báo shipper chưa lấy hàng (`pickupWait`) tính từ mốc muộn hơn giữa lúc shipper nhận và lúc món xong, vì shipper giờ nhận đơn trước khi bếp nấu.
- Mỗi lệnh ghi đều có điều kiện theo trạng thái vừa đọc. Hai lần chạy chồng nhau (hoặc 2 server) không làm một việc hai lần; quán bấm nhận đúng lúc job hủy thì chỉ một bên thắng. Mỗi bước nhắc đóng dấu `order.timeouts.*` nên chỉ chạy một lần cho mỗi đơn.
- Đơn online tính thời gian chờ từ lúc **đã thanh toán** (`payment.paidAt`), vì đó là lúc quán mới thấy đơn. Đơn COD tính từ lúc đặt.
- Hủy bởi hệ thống ghi `cancellation.by = 'system'` với `reason`:
  - `accept_timeout`: được tính là lỗi của quán (tab "Quán từ chối / không nhận" của báo cáo, tỉ lệ từ chối).
  - `no_shipper`: không tính lỗi cho quán.
  - `admin_cancel`: admin hủy thay khách.
  - `delivery_issue`: admin hủy khi xử lý báo cáo sự cố giao hàng (UC45); không tính lỗi cho quán.
- Mọi bước đều ghi timeline của khách (`order_status_history`) và gửi thông báo realtime.
- Tắt job khi chạy test tự động: `DISABLE_ORDER_JOBS=true` trong `server/.env`.

## API

| Method | Endpoint | Dùng cho |
| --- | --- | --- |
| GET / PUT | `/api/admin/settings/order-timeouts` | Xem / lưu tham số (admin) |
| GET | `/api/admin/orders?status=attention` | Đơn admin cần xử lý (TO-05, TO-06, TO-08b) |
| PATCH | `/api/admin/orders/:id/cancel` `{ note }` | Admin hủy thay khách; chỉ khi đơn chưa được lấy hàng (shipper đã nhận thì shipper được giải phóng) |
| PATCH | `/api/admin/orders/:id/release-shipper` `{ note }` | TO-08b: trả đơn shipper đã nhận nhưng chưa lấy hàng về hàng chờ |
| GET | `/api/restaurants/me/orders/board` | Đơn chờ có thêm `waitingSince`, `acceptRemindAt`, `acceptDeadline` |
| PUT | `/api/restaurants/me` | Thêm trường `prepTime` (5–120 phút) |

## Lưu ý khi demo và triển khai

- **Đơn mẫu tự hủy:** `npm run seed:orders` tạo đơn chờ 7 phút trước, nên đơn này sẽ tự hủy ngay ở lần kiểm tra đầu. Khi demo bảng bếp: tăng `acceptTimeout` trong Cấu hình vận hành, hoặc tạo đơn mới bằng `npm run seed:orders -- --new`.
- **Quán chưa có lịch:** sau khi deploy, quán `approved` có `openingHours` rỗng sẽ biến khỏi trang chủ và không nhận đơn (TO-09). Kiểm tra trên Atlas trước khi deploy: `db.restaurants.countDocuments({ status: 'approved', 'openingHours.0': { $exists: false } })`, rồi báo chủ quán khai báo lịch.
- Hạn bàn giao của đơn giờ tính theo `prepTime` của quán, không còn cố định 10 phút (giao nhanh) / 20 phút (tiêu chuẩn).

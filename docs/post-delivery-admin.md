# Module sau giao hàng & quản trị vận hành

Thành viên 5 phụ trách: UC17, UC18, UC37, UC40, UC41, UC42, UC43, UC44, UC45, kèm API tối giản cho UC34 (shipper gửi báo cáo sự cố) và toàn bộ cổng admin (gồm duyệt nhà hàng / shipper). Thiết kế dữ liệu xem [database.md](database.md) mục 5 và 6.

## 1. Màn hình

| Đường dẫn | Vai trò | Use case |
| --- | --- | --- |
| `/feedback` | customer | UC17 đánh giá, UC18 khiếu nại (menu avatar → "Đánh giá & Khiếu nại") |
| `/admin/users` | admin | UC37 quản lý tài khoản khách hàng và quản trị viên |
| `/admin/restaurants` | admin | Danh sách nhà hàng, duyệt hồ sơ đăng ký, đình chỉ, mở lại (`?review=<id>` mở thẳng hồ sơ) |
| `/admin/shippers` | admin | Danh sách tài xế, duyệt hồ sơ đăng ký, đình chỉ, mở lại (`?review=<id>` mở thẳng hồ sơ) |
| `/admin/orders` | admin | Đơn hàng toàn sàn (chỉ xem) |
| `/admin/commission-rules` | admin | UC40 quy tắc hoa hồng |
| `/admin/promotions` | admin | UC41 mã khuyến mãi |
| `/admin/complaints` | admin | UC42 xử lý khiếu nại |
| `/admin/reviews` | admin | UC43 kiểm duyệt đánh giá |
| `/admin/analytics` | admin | UC44 thống kê & báo cáo |
| `/admin/delivery-issues` | admin | UC45 xử lý sự cố giao hàng |

## 2. API

Mọi endpoint đều cần `Authorization: Bearer <jwt>`. Danh sách có phân trang trả `{ items, pagination }`, danh sách admin trả thêm `counts` để hiện số trên các tab trạng thái.

### Khách hàng (role `customer`)

| Method | Endpoint | Ghi chú |
| --- | --- | --- |
| POST | `/api/orders/:id/reviews` | `{ restaurantRating, comment?, shipperRating?, shipperComment? }` |
| GET | `/api/reviews/me?page&limit` | Đánh giá của tôi (đánh giá bị ẩn chỉ kèm `moderation.reason`) |
| GET | `/api/reviews/me/reviewable-orders` | Đơn đã giao trong 7 ngày, chưa đánh giá: `{ items, windowDays }` |
| POST | `/api/orders/:id/complaints` | `{ category, description, images? }` |
| GET | `/api/complaints/me?page&limit` | Khiếu nại của tôi kèm kết quả xử lý |
| GET | `/api/complaints/me/eligible-orders` | Đơn đã giao/hủy trong 7 ngày, chưa khiếu nại |

### Shipper (role `shipper`)

| Method | Endpoint | Ghi chú |
| --- | --- | --- |
| POST | `/api/orders/:id/delivery-issues` | `{ type, description, images? }`. Chỉ dùng cho đơn đang được gán cho chính shipper đó |

### Admin (`/api/admin/...`, role `admin`)

| Method | Endpoint | Use case |
| --- | --- | --- |
| GET | `/users?page&limit&keyword&role&status` | UC37. `status`: `all` \| `active` \| `locked` |
| GET | `/users/:id` | UC37. Kèm nhà hàng / hồ sơ tài xế, thống kê đơn, lịch sử vi phạm |
| PATCH | `/users/:id/role` | UC37. `{ role }` |
| PATCH | `/users/:id/status` | UC37. `{ isActive }` (khóa / mở khóa) |
| GET | `/restaurants?page&limit&keyword&status` | Danh sách nhà hàng (không kèm file giấy phép). `status`: `all` | `pending` | `approved` | `rejected` | `suspended`. Ô chọn nhà hàng của form hoa hồng cũng dùng API này |
| GET | `/restaurants/:id` | Hồ sơ đăng ký đầy đủ (kèm file giấy phép), `registrationChecks`, `orderStats`, `violationCount` |
| PATCH | `/restaurants/:id/status` | `{ status: 'approved' | 'rejected' | 'suspended', note }` |
| GET | `/shippers?page&limit&keyword&status` | Danh sách tài xế, tương tự nhà hàng |
| GET | `/shippers/:id` | Hồ sơ đăng ký đầy đủ của tài xế |
| PATCH | `/shippers/:id/status` | Như nhà hàng |
| GET | `/pending-approvals`, `/stats` | Trang tổng quan (không kèm file) |
| GET | `/orders?page&limit&keyword&status&paymentMethod&from&to` | Đơn toàn sàn, chỉ xem. `status`: `all` | `pending` | `preparing` (gồm `confirmed`) | `ready_for_pickup` | `delivering` | `delivered` | `cancelled`. `keyword` tìm theo mã đơn, người nhận, khách / nhà hàng / shipper. `from`, `to` là ngày đặt (giờ Việt Nam). Trả thêm `counts` theo tab |
| GET | `/orders/:id` | Chi tiết đơn + `related: { complaint, review, deliveryIssues }` |
| GET, POST | `/commission-rules` | UC40. GET trả `{ today, items, currentDefaults }` |
| PUT, DELETE | `/commission-rules/:id` | UC40 |
| GET, POST | `/promotion-rules` | UC41. Lọc `status`: `active` \| `scheduled` \| `expired` \| `disabled` \| `exhausted` |
| PUT, DELETE | `/promotion-rules/:id` | UC41 |
| GET | `/complaints?status&category&keyword` | UC42. Mặc định `status=open` |
| GET | `/complaints/:id` | UC42. Kèm `maxRefund` |
| PATCH | `/complaints/:id/resolution` | UC42. `{ decision: 'resolved' \| 'rejected', note, refundAmount? }` |
| GET | `/reviews?visibility&rating&keyword` | UC43 |
| GET | `/reviews/:id` | UC43 |
| PATCH | `/reviews/:id/visibility` | UC43. `{ isHidden: true, reason, note }` hoặc `{ isHidden: false }` |
| GET | `/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` | UC44. Tối đa 366 ngày, trên 62 ngày thì gộp theo tháng |
| GET | `/delivery-issues?status&type&keyword` | UC45. Mặc định `status=open` |
| GET | `/delivery-issues/:id` | UC45. Kèm `violationCounts` của shipper, khách, nhà hàng |
| PATCH | `/delivery-issues/:id/resolution` | UC45. `{ decision: 'resolved' \| 'dismissed', note, penalty: { target, action, fineAmount? } \| null }` |

Ảnh minh chứng: upload qua `POST /api/uploads/images?folder=complaints` (khách hàng) hoặc `folder=delivery-issues` (shipper). Server chỉ nhận ảnh do chính người gửi tải lên.

## 3. Quy tắc nghiệp vụ

- **Đánh giá (UC17):** chỉ đơn `delivered`, trong 7 ngày kể từ lúc giao, mỗi đơn một lần. Đơn có shipper thì bắt buộc chấm sao shipper.
- **Kiểm duyệt (UC43):** ẩn đánh giá phải chọn lý do (`spam`, `offensive`, `irrelevant`, `personal_info`, `other` kèm ghi chú). Ẩn hoặc hiện lại đều tính lại điểm nhà hàng và shipper. Khách vẫn thấy đánh giá của mình kèm lý do bị ẩn.
- **Khiếu nại (UC18 → UC42):** đơn `delivered` hoặc `cancelled`, trong 7 ngày, mỗi đơn một lần, tối đa 3 ảnh. Không khiếu nại được đơn online chưa từng thanh toán (khách hủy ở trang thanh toán). Admin chấp nhận (có thể hoàn tiền) hoặc từ chối, luôn kèm phản hồi cho khách. Số tiền hoàn ≤ số khách đã trả (`payment.status` là `paid`/`refunded`) trừ phần đã hoàn khi hủy. Hoàn tiền hiện là **mô phỏng**.
- **Sự cố (UC34 → UC45):** shipper báo cáo khi đơn ở `ready_for_pickup`/`delivering`, hoặc trong 24 giờ sau khi đơn kết thúc. Mỗi đơn có tối đa một báo cáo đang chờ xử lý. Khi xác nhận, admin có thể xử phạt một bên:
  - `warning`, `fine` (10.000–5.000.000đ, mô phỏng): chỉ ghi nhận vào lịch sử vi phạm.
  - `suspend`: nhà hàng chuyển `suspended` (không nhận đơn mới, vẫn hoàn tất được đơn đang có); shipper hoặc khách bị **khóa tài khoản**, mở lại ở UC37.
- **Duyệt nhà hàng / shipper:**
  - Chuyển trạng thái: duyệt `pending`/`rejected` → `approved`; từ chối `pending` → `rejected`; đình chỉ `approved` → `suspended`; mở lại `suspended` → `approved`. Từ chối và đình chỉ bắt buộc nhập lý do (≥ 5 ký tự), lưu ở `statusChange`.
  - Chỉ duyệt được khi đủ các mục bắt buộc của form đăng ký (server kiểm tra, cùng danh sách hiển thị trong hồ sơ): email đã xác thực; nhà hàng có tên, địa chỉ thật, mặt hàng kinh doanh, CCCD 9–12 số, file giấy phép; tài xế đủ 18 tuổi, CCCD 9–12 số, thông tin xe. Bảo hiểm xe không bắt buộc (form cho bổ sung sau). Mở lại không kiểm tra lại hồ sơ.
  - Hiệu lực: nhà hàng chưa `approved` không nhận được đơn mới; nhà hàng `suspended` không sửa được thực đơn. Tài xế chưa `approved` không xem được `GET /api/orders/available-for-pickup` (403). Khóa tài khoản (UC37) là việc riêng: chặn đăng nhập.
  - Trang tổng quan chỉ liệt kê hồ sơ chờ duyệt và dẫn sang trang nhà hàng / tài xế; không còn duyệt nhanh khi chưa xem hồ sơ.
- **Đơn hàng toàn sàn:** admin chỉ xem, không đổi trạng thái hay hoàn tiền. Không liệt kê đơn chuyển khoản khách bỏ dở (`PLACED_ORDER_FILTER`), giống thống kê UC44.
- **Tài khoản (UC37):** admin không tự đổi vai trò hay tự khóa mình được. Không đổi vai trò khi chủ quán còn sở hữu nhà hàng, shipper còn đơn đang giao, hoặc khách còn đơn chưa hoàn tất. Tài khoản bị khóa không đăng nhập được và token cũ trả 403.
- **Hoa hồng (UC40):** quy tắc riêng của một nhà hàng ưu tiên hơn quy tắc mặc định. Các quy tắc cùng phạm vi không được trùng thời gian. Quy tắc **đã bắt đầu áp dụng** chỉ được sửa tên, ghi chú, ngày kết thúc (không sớm hơn hôm nay) và không xóa được, để giữ đúng số liệu báo cáo; muốn đổi tỷ lệ thì kết thúc quy tắc cũ và tạo quy tắc mới.
- **Khuyến mãi (UC41):**
  - Mã đã được dùng (`usedCount > 0`) thì không đổi mã, không xóa được (chỉ tắt), và `usageLimit` không được nhỏ hơn `usedCount`. `usageLimit = null` nghĩa là không giới hạn.
  - Mã **đã bắt đầu** (hoặc đã có người dùng) bị khóa điều kiện: loại giảm, mức giảm, giảm tối đa, đơn tối thiểu, thời gian bắt đầu. Chỉ sửa được tên, mô tả, thời gian kết thúc, số lượt, bật / tắt. Muốn đổi điều kiện thì tắt mã và tạo mã mới.
  - Mã giảm số tiền cố định phải có đơn tối thiểu ≥ mức giảm (nếu không, đơn nhỏ được miễn phí vì checkout giảm tối đa bằng tiền món).
  - Thời gian kết thúc mới phải ở tương lai; mã đã hết hạn vẫn sửa được tên hoặc tắt.
  - Lệnh lưu có điều kiện trên `usedCount`: nếu khách vừa dùng mã trong lúc admin sửa thì trả 409.
- **Thống kê (UC44):** đơn tính theo ngày đặt (giờ Việt Nam), bỏ qua đơn thanh toán online chưa từng trả tiền, kể cả khi khách đã hủy đơn đó (`PLACED_ORDER_FILTER` trong `orderPolicy.js`). Giảm giá đọc `discount`, nếu trống thì đọc `promotion.discountAmount` của đơn checkout. Doanh thu (GMV) và hoa hồng chỉ tính đơn `delivered`. Hoa hồng = tiền món × tỷ lệ nhà hàng + phí giao × tỷ lệ shipper, theo quy tắc đang áp dụng vào ngày đặt đơn. Có nút xuất CSV.

## 4. Việc cần làm khi tích hợp với module khác

- **UC16 – Lịch sử đơn (module Cart & Order):** gắn nút mở `components/ReviewOrderModal` và `components/ComplaintFormModal`. Prop `order` cần có `{ _id, orderCode, restaurant: { name, logo }, shipper: { fullName } | null, items: [{ name, quantity }] }`.
- **UC34 – Shipper:** tải ảnh với `folder=delivery-issues`, rồi gọi `deliveryIssueApi.createDeliveryIssue(orderId, { type, description, images })`. Các giá trị `type` nằm trong `client/src/utils/deliveryIssueLabels.js`.
- **Chuyển đơn sang `delivered`:** phải `$push` dòng `statusHistory` tương ứng và với đơn COD thì đặt `payment.status = 'paid'`. Đánh giá, khiếu nại và giới hạn hoàn tiền đều dựa vào hai giá trị này.
- **Checkout – UC14:** dùng chung model `PromotionRule`.
  - `/api/promotions` chỉ còn `GET` (các mã khách dùng được ngay, chỉ trường công khai) và `POST /apply`. Admin tạo / sửa / xóa mã qua `/api/admin/promotion-rules`.
  - Chỉ có một trang `/admin/promotions` (bản `pages/AdminPromotions`).
  - Checkout tăng `usedCount` mỗi khi một đơn dùng mã.

## 5. Dữ liệu mẫu

```bash
cd server && npm run seed:feedback   # cần chạy seed.js, seed:menu, seed:orders trước
```

Script tạo khoảng 100 đơn trong 45 ngày gần nhất (cho biểu đồ), đánh giá (1 đánh giá đã bị ẩn), 3 khiếu nại, 3 báo cáo sự cố, 4 quy tắc hoa hồng và 6 mã khuyến mãi (mỗi trạng thái một mã). Script **ghi đè**: toàn bộ quy tắc hoa hồng; các mã demo; đánh giá, khiếu nại, sự cố của nhà hàng demo; và các đơn do chính script tạo ở lần chạy trước.

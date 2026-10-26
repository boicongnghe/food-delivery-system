# Module sau giao hàng & quản trị vận hành

Thành viên 5 phụ trách: UC17, UC18, UC37, UC40, UC41, UC42, UC43, UC44, UC45, kèm API tối giản cho UC34 (shipper gửi báo cáo sự cố). Thiết kế dữ liệu xem [database.md](database.md) mục 5 và 6.

## 1. Màn hình

| Đường dẫn | Vai trò | Use case |
| --- | --- | --- |
| `/feedback` | customer | UC17 đánh giá, UC18 khiếu nại (menu avatar → "Đánh giá & Khiếu nại") |
| `/admin/users` | admin | UC37 quản lý tài khoản |
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
| GET | `/restaurants?keyword&limit` | Ô chọn nhà hàng trong form hoa hồng |
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
- **Khiếu nại (UC18 → UC42):** đơn `delivered` hoặc `cancelled`, trong 7 ngày, mỗi đơn một lần, tối đa 3 ảnh. Admin chấp nhận (có thể hoàn tiền) hoặc từ chối, luôn kèm phản hồi cho khách. Số tiền hoàn ≤ số khách đã trả (`payment.status` là `paid`/`refunded`) trừ phần đã hoàn khi hủy. Hoàn tiền hiện là **mô phỏng**.
- **Sự cố (UC34 → UC45):** shipper báo cáo khi đơn ở `ready_for_pickup`/`delivering`, hoặc trong 24 giờ sau khi đơn kết thúc. Mỗi đơn có tối đa một báo cáo đang chờ xử lý. Khi xác nhận, admin có thể xử phạt một bên:
  - `warning`, `fine` (10.000–5.000.000đ, mô phỏng): chỉ ghi nhận vào lịch sử vi phạm.
  - `suspend`: nhà hàng chuyển `suspended` (không nhận đơn mới, vẫn hoàn tất được đơn đang có); shipper hoặc khách bị **khóa tài khoản**, mở lại ở UC37.
- **Tài khoản (UC37):** admin không tự đổi vai trò hay tự khóa mình được. Không đổi vai trò khi chủ quán còn sở hữu nhà hàng, shipper còn đơn đang giao, hoặc khách còn đơn chưa hoàn tất. Tài khoản bị khóa không đăng nhập được và token cũ trả 403.
- **Hoa hồng (UC40):** quy tắc riêng của một nhà hàng ưu tiên hơn quy tắc mặc định. Các quy tắc cùng phạm vi không được trùng thời gian. Quy tắc **đã bắt đầu áp dụng** chỉ được sửa tên, ghi chú, ngày kết thúc (không sớm hơn hôm nay) và không xóa được, để giữ đúng số liệu báo cáo; muốn đổi tỷ lệ thì kết thúc quy tắc cũ và tạo quy tắc mới.
- **Khuyến mãi (UC41):** mã đã được dùng (`usedCount > 0`) thì không đổi mã, không xóa được (chỉ tắt), và `usageLimit` không được nhỏ hơn `usedCount`. `usageLimit = null` nghĩa là không giới hạn.
- **Thống kê (UC44):** đơn tính theo ngày đặt (giờ Việt Nam), bỏ qua đơn thanh toán online chưa trả. Doanh thu (GMV) và hoa hồng chỉ tính đơn `delivered`. Hoa hồng = tiền món × tỷ lệ nhà hàng + phí giao × tỷ lệ shipper, theo quy tắc đang áp dụng vào ngày đặt đơn. Có nút xuất CSV.

## 4. Việc cần làm khi tích hợp với module khác

- **UC16 – Lịch sử đơn (module Cart & Order):** gắn nút mở `components/ReviewOrderModal` và `components/ComplaintFormModal`. Prop `order` cần có `{ _id, orderCode, restaurant: { name, logo }, shipper: { fullName } | null, items: [{ name, quantity }] }`.
- **UC34 – Shipper:** tải ảnh với `folder=delivery-issues`, rồi gọi `deliveryIssueApi.createDeliveryIssue(orderId, { type, description, images })`. Các giá trị `type` nằm trong `client/src/utils/deliveryIssueLabels.js`.
- **Chuyển đơn sang `delivered`:** phải `$push` dòng `statusHistory` tương ứng và với đơn COD thì đặt `payment.status = 'paid'`. Đánh giá, khiếu nại và giới hạn hoàn tiền đều dựa vào hai giá trị này.
- **Checkout – UC14 (nhánh `odgnoud`):** model `PromotionRule` đang **giống hệt** bản trên nhánh đó nên merge không xung đột. Khi merge:
  - Xóa các route `POST/PUT/DELETE /api/promotions`: hiện chúng chưa có `protect`/`authorize`, ai cũng tạo hoặc xóa được mã. Admin quản lý mã qua `/api/admin/promotion-rules`.
  - Chỉ giữ một trang `/admin/promotions` (bản `pages/AdminPromotions`).
  - Checkout tăng `usedCount` mỗi khi một đơn dùng mã.

## 5. Dữ liệu mẫu

```bash
cd server && npm run seed:feedback   # cần chạy seed.js, seed:menu, seed:orders trước
```

Script tạo khoảng 100 đơn trong 45 ngày gần nhất (cho biểu đồ), đánh giá (1 đánh giá đã bị ẩn), 3 khiếu nại, 3 báo cáo sự cố, 4 quy tắc hoa hồng và 6 mã khuyến mãi (mỗi trạng thái một mã). Script **ghi đè**: toàn bộ quy tắc hoa hồng; các mã demo; đánh giá, khiếu nại, sự cố của nhà hàng demo; và các đơn do chính script tạo ở lần chạy trước.

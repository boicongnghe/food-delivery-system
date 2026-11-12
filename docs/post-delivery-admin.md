# Module sau giao hàng & quản trị vận hành

Thành viên 5 phụ trách: UC17, UC18, UC37, UC40, UC41, UC42, UC43, UC44, UC45, kèm API tối giản cho UC34 (shipper gửi báo cáo sự cố) và toàn bộ cổng admin (gồm duyệt nhà hàng / shipper). Thiết kế dữ liệu xem [database.md](database.md) mục 5 và 6.

## 1. Màn hình

| Đường dẫn | Vai trò | Use case |
| --- | --- | --- |
| `/feedback` | customer | UC17 đánh giá, UC18 khiếu nại (menu avatar → "Đánh giá & Khiếu nại") |
| `/delivery-issues` | customer | Đối chất sự cố giao hàng (menu avatar → "Đối chất sự cố"). `?id=<issueId>` mở thẳng một phiên (link trong thông báo mời) |
| `/restaurant/delivery-issues` | restaurant_owner | Như trên, cho chủ quán (menu tài khoản → "Đối chất sự cố") |
| `/shipper/issues` | shipper | Như trên, cho shipper (menu tài khoản → "Đối chất sự cố") |
| `/admin/users` | admin | UC37 quản lý tài khoản khách hàng và quản trị viên |
| `/admin/restaurants` | admin | Danh sách nhà hàng, duyệt hồ sơ đăng ký, đình chỉ, mở lại (`?review=<id>` mở thẳng hồ sơ) |
| `/admin/shippers` | admin | Danh sách tài xế, duyệt hồ sơ đăng ký, đình chỉ, mở lại (`?review=<id>` mở thẳng hồ sơ) |
| `/admin/orders` | admin | Đơn hàng toàn sàn (chỉ xem) |
| `/admin/commission-rules` | admin | UC40 quy tắc hoa hồng |
| `/admin/promotions` | admin | UC41 mã khuyến mãi |
| `/admin/support-cases` | admin | Trang "Khiếu nại & sự cố": tab Khiếu nại (UC42, mặc định) và tab Sự cố giao hàng (`?tab=delivery-issues`, UC45). Đường dẫn cũ `/admin/complaints`, `/admin/delivery-issues` tự chuyển sang tab tương ứng |
| `/admin/reviews` | admin | UC43 kiểm duyệt đánh giá |
| `/admin/analytics` | admin | UC44 thống kê & báo cáo |
| `/admin/settings` | admin | Cấu hình vận hành: thời hạn xử lý đơn, ngưỡng tự động đình chỉ khi vi phạm |

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

### Các bên của đơn trong phiên đối chất (role `customer`, `shipper`, `restaurant_owner`)

Chỉ shipper, khách và chủ quán của đúng báo cáo đó, và chỉ khi admin đã mở đối chất. Người ngoài nhận 404.

| Method | Endpoint | Ghi chú |
| --- | --- | --- |
| GET | `/api/delivery-issues/me/hearings?page&limit` | Các phiên đối chất mình được mời, mới nhất trước: `{ code, orderCode, type, status, restaurantName, deadline, hearingState }` |
| GET | `/api/delivery-issues/:id` | Báo cáo của shipper, tên 3 bên, `hearing: { openedAt, deadline, closedAt }`, `hearingState`, `myParty`. Không kèm số điện thoại, lịch sử vi phạm |
| GET | `/api/delivery-issues/:id/messages` | Tối đa 200 tin gần nhất, cũ trước: `{ _id, issue, sender, senderName, party, message, createdAt }` |
| POST | `/api/delivery-issues/:id/messages` | `{ message }` (1–1000 ký tự). Chỉ khi phiên đang mở (409 nếu chưa mở / đã kết thúc) |

Realtime qua Socket.io (room `user:<id>` của 3 bên và `role:admin`): `issue_hearing_message` (tin mới, cùng dạng như trên), `issue_hearing_updated` (`{ issueId }`: phiên mở / kết thúc / báo cáo đã kết luận).

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
| GET | `/shippers?page&limit&keyword&status` | Danh sách tài xế, tương tự nhà hàng. Mỗi tài xế kèm `availability: { isOnline, activeOrders }` (công tắc "Nhận đơn" của app tài xế `driverdashboards.isOnline`, số đơn đang giữ). Cột trạng thái: tài xế `approved` hiện "Đang nhận đơn" / "Tắt nhận đơn", trạng thái khác giữ nhãn hồ sơ |
| GET | `/shippers/:id` | Hồ sơ đăng ký đầy đủ của tài xế, kèm `availability` |
| PATCH | `/shippers/:id/status` | Như nhà hàng |
| GET | `/pending-approvals`, `/stats` | Trang tổng quan (không kèm file) |
| GET | `/orders?page&limit&keyword&status&paymentMethod&from&to` | Đơn toàn sàn, chỉ xem. `status`: `all` | `pending` | `confirmed` (chờ shipper nhận) | `preparing` | `ready_for_pickup` | `delivering` | `delivered` | `cancelled`. `keyword` tìm theo mã đơn, người nhận, khách / nhà hàng / shipper. `from`, `to` là ngày đặt (giờ Việt Nam). Trả thêm `counts` theo tab |
| GET | `/orders/:id` | Chi tiết đơn + `related: { complaint, review, deliveryIssues }` |
| PATCH | `/orders/:id/cancel` | `{ note }`. Hủy thay khách khi đơn chưa được lấy hàng, kể cả khi shipper đã nhận ([order-timeouts.md](order-timeouts.md)) |
| PATCH | `/orders/:id/release-shipper` | `{ note }`. Shipper đã nhận nhưng chưa lấy hàng (bếp đang nấu hoặc món đã xong): trả đơn về hàng chờ cho shipper khác, bếp giữ nguyên trạng thái |
| PATCH | `/orders/:id/refund` | `{ result: 'succeeded' \| 'failed', reference?, note? }`. Ghi kết quả chuyển trả tiền (R06) |
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
| GET | `/delivery-issues?status&type&keyword` | UC45. Mặc định `status=open`. Mỗi báo cáo kèm `hearingState`: `none` \| `open` \| `closed` |
| GET | `/delivery-issues/:id` | UC45. Kèm `violationCounts` (tổng số lần bị phạt) của shipper, khách, nhà hàng, `autoSuspend: { threshold, counts }` (số lần bị phạt kể từ lần đình chỉ gần nhất), `hearingState`, `hearingMessageCount` |
| PATCH | `/delivery-issues/:id/order-action` | UC45. `{ orderAction: 'release' \| 'cancel', note }`. Xử lý đơn ngay, tách khỏi kết luận; mỗi báo cáo một lần |
| PATCH | `/delivery-issues/:id/hearing` | UC45. `{ deadlineHours }` (1–24, mặc định 24). Mở (hoặc mở lại) đối chất, gửi thông báo mời 3 bên |
| PATCH | `/delivery-issues/:id/hearing/close` | UC45. Kết thúc đối chất sớm |
| GET, POST | `/delivery-issues/:id/messages` | UC45. Admin đọc / gửi tin trong phiên đối chất, như API của các bên |
| GET | `/settings/violations` | UC45. `{ values: { autoSuspendThreshold }, defaults, updatedAt, updatedBy }` |
| PUT | `/settings/violations` | UC45. `{ autoSuspendThreshold }` (0–20, `0` = tắt tự động đình chỉ) |
| PATCH | `/delivery-issues/:id/resolution` | UC45. `{ decision: 'resolved' \| 'dismissed', note, penalty: { target, action, fineAmount? } \| null }`. Có `penalty` thì phiên đối chất phải đã kết thúc (409 nếu chưa) |

Ảnh minh chứng: upload qua `POST /api/uploads/images?folder=complaints` (khách hàng) hoặc `folder=delivery-issues` (shipper). Server chỉ nhận ảnh do chính người gửi tải lên.

## 3. Quy tắc nghiệp vụ

- **Đánh giá (UC17):** chỉ đơn `delivered`, trong 7 ngày kể từ lúc giao, mỗi đơn một lần. Đơn có shipper thì bắt buộc chấm sao shipper.
- **Kiểm duyệt (UC43):** ẩn đánh giá phải chọn lý do (`spam`, `offensive`, `irrelevant`, `personal_info`, `other` kèm ghi chú). Ẩn hoặc hiện lại đều tính lại điểm nhà hàng và shipper. Khách vẫn thấy đánh giá của mình kèm lý do bị ẩn.
- **Khiếu nại (UC18 → UC42):** đơn `delivered` hoặc `cancelled`, trong 7 ngày, mỗi đơn một lần, tối đa 3 ảnh. Không khiếu nại được đơn online chưa từng thanh toán (khách hủy ở trang thanh toán). Admin chấp nhận (có thể hoàn tiền) hoặc từ chối, luôn kèm phản hồi cho khách. Số tiền hoàn ≤ số khách đã trả (`payment.status` là `paid`/`refunded`) trừ phần đã hoàn khi hủy. Hoàn tiền hiện là **mô phỏng**.
- **Sự cố (UC34 → UC45):** shipper chỉ báo cáo được khi đơn mình đang giữ ở `preparing`/`ready_for_pickup`/`delivering`; đơn đã kết thúc thì không báo được nữa. Mỗi đơn có tối đa một báo cáo đang chờ xử lý. Admin xử lý theo 3 bước tách rời:
  1. **Xử lý đơn hàng** (`/order-action`, làm ngay, không chờ đối chất hay kết luận), chỉ khi báo cáo còn mở và shipper báo cáo vẫn đang giữ đơn; mỗi báo cáo một lần. Không làm gì thì shipper tiếp tục giao (`resolution.orderAction` giữ `none`):
     - `release`: trả đơn về hàng chờ cho shipper khác, chỉ khi shipper **chưa lấy hàng**.
     - `cancel`: hủy đơn (`cancellation.by = system`, `reason = delivery_issue`, không tính lỗi cho quán). Đơn đã trả tiền có yêu cầu hoàn tiền (tab "Chờ hoàn tiền").
     - Cả hai đều giải phóng shipper để nhận đơn mới. Lệnh đổi đơn có điều kiện theo trạng thái và shipper vừa đọc. Kết quả lưu ở `resolution.orderAction/orderActionBy/orderActionAt` và được giữ nguyên khi kết luận.
  2. **Đối chất** (bắt buộc trước khi xử phạt): admin mời shipper, khách và chủ quán vào **chat tự do** với nhau (admin cũng nhắn được), thời hạn 1–24 giờ.
     - Mở: 3 bên nhận thông báo kèm link vào trang đối chất của cổng mình.
     - Phiên kết thúc khi hết hạn, khi admin bấm "Kết thúc đối chất sớm", hoặc khi báo cáo được kết luận. Sau đó chỉ xem lại được.
     - Phiên đã kết thúc có thể mở lại (thời hạn mới, giữ tin nhắn cũ) khi báo cáo còn mở. Không mở 2 phiên cùng lúc (409).
     - Mỗi bên chỉ thấy tên các bên và nội dung, không thấy số điện thoại hay lịch sử vi phạm.
  3. **Kết luận** (`/resolution`):
     - Bác bỏ (`dismissed`), hoặc xác nhận không xử phạt: làm được bất cứ lúc nào, không cần đối chất.
     - Xác nhận có xử phạt một bên: phiên đối chất phải **đã kết thúc** (chưa mở hoặc đang diễn ra → 409).
       - `warning`, `fine` (10.000–5.000.000đ, mô phỏng): chỉ ghi nhận vào lịch sử vi phạm.
       - `suspend`: nhà hàng chuyển `suspended` (không nhận đơn mới, vẫn hoàn tất được đơn đang có); shipper hoặc khách bị **khóa tài khoản**, mở lại ở UC37.
  - Khóa shipper (`suspend` hoặc tự động) khi shipper còn giữ bất kỳ đơn nào đang giao sẽ bị từ chối (409): phải hủy hoặc trả đơn về hàng chờ ở bước 1 trước.
  - **Tự động đình chỉ:** mỗi lần phạt (`warning`, `fine` hoặc `suspend`) tính là một lần vi phạm của tài khoản bị phạt (vi phạm của nhà hàng tính cho chủ quán). Khi một lần phạt làm số vi phạm **kể từ lần đình chỉ gần nhất** đạt `autoSuspendThreshold` (mặc định 3, chỉnh ở `/admin/settings`, `0` = tắt), tài khoản bị đình chỉ như `suspend` và lần phạt được đánh dấu `autoSuspended`.
    - Bộ đếm bắt đầu lại sau mỗi lần đình chỉ: mở lại tài khoản thì lần phạt kế tiếp không khóa ngay.
    - Ràng buộc shipper còn giữ đơn ở trên vẫn áp dụng khi tự động khóa shipper.
    - Đổi ngưỡng chỉ áp dụng cho lần phạt tiếp theo, không đình chỉ ngược các tài khoản đã vượt ngưỡng mới.
- **Duyệt nhà hàng / shipper:**
  - Chuyển trạng thái: duyệt `pending`/`rejected` → `approved`; từ chối `pending` → `rejected`; đình chỉ `approved` → `suspended`; mở lại `suspended` → `approved`. Từ chối và đình chỉ bắt buộc nhập lý do (≥ 5 ký tự), lưu ở `statusChange`.
  - Chỉ duyệt được khi đủ các mục bắt buộc của form đăng ký (server kiểm tra, cùng danh sách hiển thị trong hồ sơ): email đã xác thực; nhà hàng có tên, địa chỉ thật, mặt hàng kinh doanh, CCCD 9–12 số, file giấy phép; tài xế đủ 18 tuổi, CCCD 9–12 số, thông tin xe. Bảo hiểm xe không bắt buộc (form cho bổ sung sau). **Mở lại** đối tác bị đình chỉ cũng kiểm tra lại các mục này theo hồ sơ hiện tại.
  - Hiệu lực: nhà hàng chưa `approved` không nhận được đơn mới; nhà hàng `suspended` không sửa được thực đơn lẫn hồ sơ quán (403), để admin mở lại đúng hồ sơ đã bị đình chỉ. Tài xế chưa `approved` không xem được `GET /api/orders/available-for-pickup` (403). Khóa tài khoản (UC37) là việc riêng: chặn đăng nhập.
  - Trang tổng quan chỉ liệt kê hồ sơ chờ duyệt và dẫn sang trang nhà hàng / tài xế; không còn duyệt nhanh khi chưa xem hồ sơ.
- **Đơn hàng toàn sàn:** admin không tự chuyển bước cho đơn. Admin chỉ được: hủy thay khách khi đơn chưa được lấy hàng, đổi shipper khi shipper đã nhận nhưng chưa lấy hàng, và ghi kết quả hoàn tiền. Đơn đã lấy hàng (`delivering`) xử lý qua báo cáo sự cố. Không liệt kê đơn chuyển khoản khách bỏ dở (`PLACED_ORDER_FILTER`), giống thống kê UC44.
- **Tài khoản (UC37):** admin không tự đổi vai trò hay tự khóa mình được. Không đổi vai trò khi chủ quán còn sở hữu nhà hàng, shipper còn đơn đang giao, hoặc khách còn đơn chưa hoàn tất. Không khóa được shipper đang giữ đơn (`ready_for_pickup`/`delivering`), vì shipper bị khóa không giao tiếp được mà cũng không ai nhận thay. Tài khoản bị khóa không đăng nhập được và token cũ trả 403.
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

Script tạo khoảng 100 đơn trong 45 ngày gần nhất (cho biểu đồ), đánh giá (1 đánh giá đã bị ẩn), 3 khiếu nại, 4 báo cáo sự cố (1 báo cáo đang đối chất, có sẵn tin nhắn của 3 bên và admin), 4 quy tắc hoa hồng và 6 mã khuyến mãi (mỗi trạng thái một mã). Script **ghi đè**: toàn bộ quy tắc hoa hồng; các mã demo; đánh giá, khiếu nại, sự cố của nhà hàng demo; và các đơn do chính script tạo ở lần chạy trước.

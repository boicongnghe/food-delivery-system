# Quy ước API

## 1. Base URL

- Dev: `http://localhost:5000/api`
- Client lấy từ biến môi trường `VITE_API_URL`, **không hard-code**.

## 2. Quy ước đặt endpoint (REST)

- Dùng **danh từ số nhiều**, chữ thường, nối bằng gạch ngang (kebab-case).
- Không đưa động từ vào URL – hành động thể hiện qua HTTP method.
- Lồng tài nguyên tối đa **2 cấp**.
- Hành động đặc biệt không phải CRUD: dùng sub-resource danh từ, ví dụ `PATCH /orders/:id/status`.

| Đúng | Sai |
| --- | --- |
| `GET /api/restaurants` | `GET /api/getRestaurants` |
| `GET /api/restaurants/:id/menu-items` | `GET /api/restaurant/:id/menuItems` |
| `POST /api/orders` | `POST /api/createOrder` |
| `PATCH /api/orders/:id/status` | `POST /api/orders/:id/update-status` |

Ví dụ endpoint dự kiến:

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me
GET    /api/restaurants?page=1&limit=10&keyword=pho
GET    /api/restaurants/:id
POST   /api/restaurants/:id/menu-items
PUT    /api/menu-items/:id
DELETE /api/menu-items/:id
POST   /api/orders
GET    /api/orders/:id
PATCH  /api/orders/:id/status
POST   /api/orders/:id/reviews
```

## 3. HTTP method

| Method | Mục đích | Ví dụ |
| --- | --- | --- |
| `GET` | Lấy dữ liệu (không thay đổi gì) | `GET /api/restaurants` |
| `POST` | Tạo mới | `POST /api/orders` |
| `PUT` | Cập nhật toàn bộ tài nguyên | `PUT /api/menu-items/:id` |
| `PATCH` | Cập nhật một phần | `PATCH /api/orders/:id/status` |
| `DELETE` | Xóa | `DELETE /api/menu-items/:id` |

## 4. Status code dùng trong dự án

| Code | Ý nghĩa | Khi nào dùng |
| --- | --- | --- |
| `200 OK` | Thành công | GET, PUT, PATCH, DELETE thành công |
| `201 Created` | Đã tạo | POST tạo mới thành công |
| `400 Bad Request` | Dữ liệu sai | Thiếu trường, sai định dạng, validate fail |
| `401 Unauthorized` | Chưa xác thực | Thiếu token, token sai/hết hạn, sai mật khẩu |
| `403 Forbidden` | Không đủ quyền | Đúng token nhưng sai role / không phải chủ sở hữu |
| `404 Not Found` | Không tìm thấy | ID không tồn tại, route không tồn tại |
| `409 Conflict` | Xung đột | Email đã tồn tại, đơn đã bị hủy không thể cập nhật |
| `500 Internal Server Error` | Lỗi server | Lỗi không lường trước (do `errorHandler` trả) |

## 5. Format response thống nhất

### Thành công

```json
{
  "success": true,
  "data": { "_id": "665f...", "name": "Phở Hà Nội" },
  "message": "Get restaurant successfully"
}
```

### Thành công có phân trang

```json
{
  "success": true,
  "data": {
    "items": [ { "_id": "665f...", "name": "Phở Hà Nội" } ],
    "pagination": { "page": 1, "limit": 10, "totalItems": 42, "totalPages": 5 }
  },
  "message": "Get restaurants successfully"
}
```

### Lỗi

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email is invalid" }
  ]
}
```

- `errors` luôn là mảng (rỗng nếu không có chi tiết).
- Ở môi trường dev, response lỗi có thêm `stack` để debug. Khi `NODE_ENV=production`, **không trả `stack`** và lỗi 500 chỉ trả message chung.
- Trong code: service `throw new ApiError(statusCode, message, errors)`; `middlewares/errorHandler.js` tự format. Không tự viết `res.status(4xx).json(...)` rải rác trong controller.

## 6. Xác thực (JWT)

- Đăng nhập thành công trả về token trong `data`:

  ```json
  { "success": true, "data": { "token": "eyJhbGciOi...", "user": { "_id": "...", "role": "customer" } }, "message": "Login successfully" }
  ```

- Client lưu token vào `localStorage` với key `token`; `axiosClient` tự gắn header:

  ```
  Authorization: Bearer <token>
  ```

- Payload token tối thiểu: `{ id, role }`. Thời hạn lấy từ `JWT_EXPIRES_IN`.
- Middleware (sẽ viết trong module Auth): `protect` (kiểm tra token, gắn `req.user`) và `authorize(...roles)` (kiểm tra role).
- Role hợp lệ: `customer`, `restaurant_owner`, `shipper`, `admin`.
- **Không bao giờ** trả `password` trong response.

## 7. Phân trang, lọc, sắp xếp

| Query | Mặc định | Ghi chú |
| --- | --- | --- |
| `page` | `1` | Bắt đầu từ 1 |
| `limit` | `10` | Tối đa `100` |
| `sort` | `-createdAt` | Thêm `-` để sắp xếp giảm dần, ví dụ `sort=price` hoặc `sort=-rating` |
| `keyword` | – | Tìm kiếm theo tên |
| các trường khác | – | Lọc bằng tên trường, ví dụ `status=pending` |

Ví dụ: `GET /api/restaurants?page=2&limit=20&sort=-rating&keyword=pho`

## 8. Quy ước dữ liệu

- Tên trường JSON: **camelCase** (`menuItems`, `totalPrice`, `createdAt`).
- Thời gian: chuỗi ISO 8601 (UTC), ví dụ `2026-10-13T08:00:00.000Z`.
- Tiền: số nguyên, đơn vị **VND** (`45000`), không dùng số thực.
- ID: MongoDB `_id` (ObjectId dạng chuỗi).

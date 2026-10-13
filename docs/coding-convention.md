# Quy ước viết code

## 1. Ngôn ngữ

- Tên biến, hàm, file, comment, commit message: **tiếng Anh**.
- Text hiển thị trên giao diện: tiếng Việt (hoặc theo thống nhất của nhóm).
- Tài liệu trong `docs/`: tiếng Việt.

## 2. Đặt tên

| Đối tượng | Quy ước | Ví dụ |
| --- | --- | --- |
| Biến, hàm | camelCase | `totalPrice`, `getRestaurantById` |
| Biến boolean | tiền tố `is/has/can/should` | `isLoading`, `hasPermission` |
| React component | PascalCase | `RestaurantCard`, `MainLayout` |
| Mongoose model | PascalCase, số ít | `User`, `MenuItem`, `Order` |
| Class | PascalCase | `ApiError` |
| Hằng số | UPPER_SNAKE_CASE | `ORDER_STATUS`, `MAX_LIMIT` |
| Custom hook | camelCase, bắt đầu bằng `use` | `useAuth`, `useCart` |
| Collection MongoDB | camelCase, số nhiều (Mongoose tự sinh) | `users`, `menuitems` |
| Biến môi trường | UPPER_SNAKE_CASE (client phải có tiền tố `VITE_`) | `JWT_SECRET`, `VITE_API_URL` |

### Đặt tên file – **dự án chọn camelCase** (không dùng kebab-case)

| Loại file | Quy ước | Ví dụ |
| --- | --- | --- |
| React component / page / layout | PascalCase `.jsx` | `RestaurantCard.jsx`, `pages/Home/Home.jsx` |
| Mongoose model | PascalCase `.js` | `models/User.js`, `models/MenuItem.js` |
| Class | PascalCase `.js` | `utils/ApiError.js` |
| **Mọi file còn lại** | camelCase `.js` | `authController.js`, `authService.js`, `authRoutes.js`, `axiosClient.js`, `useAuth.js`, `formatCurrency.js` |
| Thư mục | camelCase (trừ thư mục của page dùng PascalCase) | `middlewares/`, `pages/OrderDetail/` |

Hậu tố theo lớp ở backend: `<module>Controller.js`, `<module>Service.js`, `<module>Routes.js`. Ở client: `<module>Api.js`.

## 3. JavaScript chung

- Dùng `const` mặc định, `let` khi cần gán lại, **không dùng `var`**.
- Dùng `async/await`, không lồng `.then()` nhiều tầng.
- So sánh dùng `===` / `!==`.
- Dùng template string thay vì cộng chuỗi.
- Hàm ngắn, làm một việc. Hàm > 50 dòng nên tách.
- Không để code chết, code comment-out khi mở PR.
- Comment giải thích **tại sao**, không giải thích code làm gì.

## 4. Backend

- ES Modules: `import`/`export`, import tương đối **phải có đuôi `.js`**: `import ApiError from '../utils/ApiError.js';`
- Tuân thủ phân lớp trong [architecture.md](architecture.md): controller mỏng, service dày, controller không gọi model.
- Controller luôn bọc `asyncHandler`; lỗi nghiệp vụ `throw new ApiError(...)`.
- Response theo format trong [api-convention.md](api-convention.md).
- Không trả `password` hoặc dữ liệu nhạy cảm (dùng `select: false` trong schema).
- Validate input trước khi xử lý.

## 5. Frontend

- **Mỗi component một file**, tên file trùng tên component, `export default` component đó.
- Dùng function component + hooks, không dùng class component.
- Component không gọi `axios` trực tiếp – gọi qua `src/api/<module>Api.js`.
- Không thao tác DOM trực tiếp (`document.getElementById`) trong component.
- `key` trong list dùng `_id`, không dùng index.
- Props nhiều → destructure ngay ở tham số: `function RestaurantCard({ name, rating }) {}`.

## 6. Bảo mật và cấu hình

- **Không hard-code URL, secret, mật khẩu, API key.**
  - Server: `process.env.JWT_SECRET`
  - Client: `import.meta.env.VITE_API_URL`
- Thêm biến môi trường mới → cập nhật `.env.example` tương ứng (giá trị giả) trong cùng PR.
- Không commit file `.env`.
- Biến `VITE_*` sẽ bị lộ ra trình duyệt → không đặt secret ở client.

## 7. Trước khi mở PR

- [ ] Không còn `console.log` thừa (chỉ giữ `console.error` cho lỗi thật ở server).
- [ ] Không còn code comment-out, `TODO` chưa giải thích.
- [ ] `cd client && npm run build` pass; `npm run lint` không lỗi.
- [ ] Server chạy được, đã test endpoint bằng Postman/Thunder Client.
- [ ] Đúng format (2 spaces, LF – EditorConfig tự xử lý nếu cài extension).

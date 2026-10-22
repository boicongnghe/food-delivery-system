# CLAUDE.md

Ngữ cảnh dự án cho Claude Code. Tài liệu viết bằng tiếng Việt; tên biến/hàm/file, comment trong code và commit message viết bằng **tiếng Anh**.

## Dự án

Food Delivery Management (WDP301) – monorepo MERN. Vai trò: `customer`, `restaurant_owner`, `shipper`, `admin`.

- `client/` – React 19 + Vite (JavaScript, không dùng TypeScript), react-router-dom, axios, Tailwind CSS v3, lucide-react (icon), react-hot-toast
- `server/` – Node.js + Express 5, **ES Modules** (`import`/`export`, import tương đối phải có đuôi `.js`), Mongoose, Joi (validate), multer + Cloudinary (upload ảnh)
- `docs/` – quy ước chi tiết, đọc trước khi làm thay đổi lớn

## Lệnh chạy

```bash
cd server && npm run dev     # API http://localhost:5000, kiểm tra: GET /api/health
cd client && npm run dev     # UI http://localhost:5173
cd client && npm run build   # phải pass trước khi mở PR
cd client && npm run lint    # oxlint
```

Yêu cầu Node `^20.19 || >=22.12` (do Vite 8). File môi trường: copy `server/.env.example` và `client/.env.example` thành `.env`.

## Phân lớp backend (server/src)

`routes/` → `controllers/` → `services/` → `models/` → MongoDB

- Routes: chỉ khai báo endpoint và gắn middleware.
- Controllers: mỏng. Đọc `req`, gọi service, trả response. Bọc bằng `asyncHandler`. **Không gọi model trực tiếp.**
- Services: chứa toàn bộ business logic và truy cập DB qua model. Lỗi thì `throw new ApiError(statusCode, message, errors)`.
- Models: chỉ định nghĩa Mongoose schema, mỗi model một file PascalCase (`models/User.js`).
- Lỗi được đẩy về `middlewares/errorHandler.js`; không tự trả response lỗi trong controller.
- Router của từng module được mount trong `routes/index.js` dưới tiền tố `/api`.

## Format response API

```json
{ "success": true, "data": {}, "message": "..." }
{ "success": false, "message": "...", "errors": [] }
```

- REST, danh từ số nhiều, path kebab-case: `/api/restaurants/:id/menu-items`
- Xác thực: `Authorization: Bearer <jwt>`. Phân trang: `?page=1&limit=10`.
- Chi tiết: `docs/api-convention.md`.

## Cấu trúc frontend (client/src)

- `api/` – `axiosClient.js` (baseURL lấy từ `VITE_API_URL`, tự gắn Bearer token) + file API theo module (`restaurantApi.js`)
- `pages/<Name>/<Name>.jsx`, component dùng chung ở `components/`, layout ở `layouts/`, route ở `routes/AppRouter.jsx`
- `context/`, `hooks/` (`useXxx.js`), `utils/`
- Cổng đối tác (chủ quán, shipper...): dùng chung `components/Header/Header.jsx` (prop `navItems`, `status`) và `components/Footer/Footer.jsx`; xem mẫu `layouts/RestaurantLayout.jsx`. Màu `brand`/`cream` và font `font-serif` khai báo trong `tailwind.config.js`.
- Upload ảnh: lưu trên **Cloudinary**. Client gọi `uploadApi.uploadImage(file, folder)` → `POST /api/uploads/images?folder=...` trả `{ url, publicId }`; lưu `url` (https) vào DB và dùng trực tiếp trong `<img>`. Không lưu ảnh trên ổ đĩa server.

## Đặt tên

- Biến/hàm: camelCase. Component, model, class: PascalCase. Hằng số: UPPER_SNAKE_CASE.
- File: PascalCase cho React component, model, class (`Home.jsx`, `User.js`, `ApiError.js`); camelCase cho mọi file còn lại (`authController.js`, `authService.js`, `authRoutes.js`).
- Mỗi component một file. Chi tiết: `docs/coding-convention.md`.

## Git workflow

- `main` (ổn định, demo) ← `develop` (tích hợp) ← `feature/*`, `fix/*`, `docs/*`, `refactor/*`
- Tên nhánh: `feature/<module>-<mo-ta-ngan>`, ví dụ `feature/auth-login`
- Conventional Commits: `feat|fix|docs|style|refactor|test|chore(scope): message`
- PR vào `develop`, 1 PR = 1 task, tối thiểu 1 approval. Chi tiết: `docs/git-workflow.md`.

## Điều cấm

- Commit `.env`, secret, `node_modules/`, `dist/`.
- Push thẳng lên `main`/`develop`, force push nhánh chung.
- Hard-code URL hoặc secret – dùng biến môi trường (`process.env.*`, `import.meta.env.VITE_*`).
- Tự ý thêm thư viện lớn (UI kit, state manager, ORM...) khi chưa được nhóm đồng ý.
- Để `console.log` thừa trong code mở PR.
- Làm tính năng hoặc refactor ngoài phạm vi task.

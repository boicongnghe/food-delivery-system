# Food Delivery Management

Hệ thống quản lý giao đồ ăn – đồ án môn **WDP301**.

Ứng dụng web cho phép khách hàng đặt món từ nhà hàng, chủ nhà hàng quản lý thực đơn và đơn hàng, shipper nhận và giao đơn, quản trị viên giám sát toàn hệ thống.

**Vai trò người dùng:** `customer`, `restaurant_owner`, `shipper`, `admin`.

## Tech stack

| Phần      | Công nghệ                                                        |
| --------- | ---------------------------------------------------------------- |
| Frontend  | React 19 + Vite, React Router, Axios (JavaScript)                |
| Backend   | Node.js + Express 5 (ES Modules)                                 |
| Database  | MongoDB + Mongoose                                               |
| Bảo mật   | JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`               |
| Công cụ   | nodemon, morgan, Git + GitHub (Pull Request, Conventional Commits) |

## Cấu trúc thư mục

```
food-delivery-system/
├── .github/            # Template cho Pull Request và Issue
├── client/             # Frontend React (Vite)
│   └── src/
│       ├── api/        # axiosClient và các hàm gọi API
│       ├── components/ # Component dùng chung
│       ├── context/    # React Context (auth, cart...)
│       ├── hooks/      # Custom hooks
│       ├── layouts/    # Layout trang (header, sidebar...)
│       ├── pages/      # Mỗi trang một thư mục
│       ├── routes/     # Khai báo route
│       └── utils/      # Hàm tiện ích
├── server/             # Backend Express
│   └── src/
│       ├── config/     # Kết nối DB, cấu hình
│       ├── controllers/# Nhận request, trả response
│       ├── middlewares/# Auth, xử lý lỗi, 404...
│       ├── models/     # Mongoose schema
│       ├── routes/     # Khai báo endpoint
│       ├── services/   # Business logic
│       └── utils/      # ApiError, asyncHandler...
├── docs/               # Tài liệu dự án
├── CLAUDE.md           # Ngữ cảnh cho Claude Code
├── CONTRIBUTING.md     # Quy trình đóng góp
└── README.md
```

## Yêu cầu môi trường

- **Node.js** `20.19+` hoặc `22.12+` (khuyên dùng Node 22 LTS bản mới nhất). Vite 8 **không chạy** trên Node 22.0–22.11.
- **npm** 10+
- **Git** (dùng terminal Git Bash trên Windows)
- **MongoDB** Community Server (local) hoặc MongoDB Atlas

Hướng dẫn cài đặt chi tiết: [docs/setup.md](docs/setup.md).

## Chạy nhanh

```bash
# 1. Clone repo
git clone https://github.com/boicongnghe/food-delivery-system.git
cd food-delivery-system

# 2. Cài dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# 3. Tạo file môi trường từ file mẫu
cp server/.env.example server/.env
cp client/.env.example client/.env

# 4. Chạy backend (terminal 1)
cd server
npm run dev        # http://localhost:5000/api/health

# 5. Chạy frontend (terminal 2)
cd client
npm run dev        # http://localhost:5173
```

> Nhớ sửa `JWT_SECRET` trong `server/.env` thành một chuỗi ngẫu nhiên. **Không bao giờ commit file `.env`.**

## Các lệnh thường dùng

| Thư mục  | Lệnh              | Mô tả                                 |
| -------- | ----------------- | ------------------------------------- |
| `server` | `npm run dev`     | Chạy API với nodemon (tự reload)      |
| `server` | `npm start`       | Chạy API bằng node                    |
| `client` | `npm run dev`     | Chạy Vite dev server                  |
| `client` | `npm run build`   | Build production vào `client/dist`    |
| `client` | `npm run lint`    | Kiểm tra code bằng oxlint             |

## Tài liệu

| Tài liệu                                              | Nội dung                                          |
| ----------------------------------------------------- | ------------------------------------------------- |
| [docs/setup.md](docs/setup.md)                        | Cài đặt môi trường trên Windows, xử lý lỗi        |
| [docs/git-workflow.md](docs/git-workflow.md)          | Mô hình nhánh, commit, Pull Request, release      |
| [docs/architecture.md](docs/architecture.md)          | Kiến trúc phân lớp, trách nhiệm từng lớp          |
| [docs/api-convention.md](docs/api-convention.md)      | Quy ước REST API, status code, format response    |
| [docs/coding-convention.md](docs/coding-convention.md)| Quy ước đặt tên và viết code                      |
| [docs/database.md](docs/database.md)                  | Thiết kế CSDL (khung)                             |
| [docs/task-breakdown.md](docs/task-breakdown.md)      | Chia module và task cho nhóm                      |
| [CONTRIBUTING.md](CONTRIBUTING.md)                    | Quy trình đóng góp                                |

# Hướng dẫn cài đặt môi trường (Windows)

Tài liệu dành cho thành viên mới, đi từ máy trắng đến chạy được dự án.

## 1. Cài Git

1. Tải tại <https://git-scm.com/download/win> và cài đặt.
2. Trong trình cài đặt, giữ mặc định, riêng các bước sau:
   - **Default editor**: chọn *Visual Studio Code*.
   - **Default branch name**: chọn *Override* và nhập `main`.
   - **Line ending**: chọn *Checkout as-is, commit Unix-style line endings* (repo đã có `.gitattributes` ép LF).
3. Kiểm tra: mở **Git Bash** và chạy `git --version`.

## 2. Cài Node.js

1. Tải bản **LTS** tại <https://nodejs.org> (khuyên dùng Node 22 LTS bản mới nhất).
2. Yêu cầu tối thiểu: `20.19+` hoặc `22.12+`. Vite 8 **không chạy** được trên Node 22.0–22.11 (lỗi `Cannot find native binding`).
3. Kiểm tra:

   ```bash
   node -v   # v22.12.0 trở lên
   npm -v
   ```

> Nếu cần dùng nhiều phiên bản Node, cài [nvm-windows](https://github.com/coreybutler/nvm-windows).

## 3. Cài VS Code

1. Tải tại <https://code.visualstudio.com>.
2. Extension khuyên dùng: **EditorConfig for VS Code**, **ES7+ React/Redux/React-Native snippets**, **MongoDB for VS Code**, **GitLens**.

### Chuyển terminal mặc định sang Git Bash

1. Nhấn `Ctrl + Shift + P` → gõ `Terminal: Select Default Profile`.
2. Chọn **Git Bash**.
3. Mở terminal mới (menu **Terminal → New Terminal**) – dấu nhắc sẽ có dạng `MINGW64`.

Mọi lệnh trong tài liệu dự án đều viết cho Git Bash.

## 4. Cài MongoDB

Chọn **một** trong hai cách.

### Cách A – MongoDB local (khuyên dùng khi dev)

1. Tải **MongoDB Community Server** tại <https://www.mongodb.com/try/download/community>.
2. Khi cài, tick **Install MongoDB as a Service** (tự chạy khi bật máy) và **Install MongoDB Compass** (giao diện xem dữ liệu).
3. Mở Compass, kết nối tới `mongodb://localhost:27017` để kiểm tra.
4. Trong `server/.env`: `MONGO_URI=mongodb://localhost:27017/food_delivery`.

### Cách B – MongoDB Atlas (cloud, miễn phí)

1. Đăng ký tại <https://www.mongodb.com/atlas>, tạo cluster **M0 (Free)**.
2. **Database Access**: tạo user + mật khẩu.
3. **Network Access**: thêm IP của bạn (hoặc `0.0.0.0/0` khi dev – không dùng cho production).
4. **Connect → Drivers**: copy connection string, điền vào `server/.env`:

   ```
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/food_delivery
   ```

## 5. Cấu hình Git

```bash
git config --global user.name "Ho Ten Cua Ban"
git config --global user.email "email-dung-cho-github@example.com"
git config --global core.autocrlf input
git config --global init.defaultBranch main
```

Email phải trùng email đã đăng ký GitHub để commit được tính đúng người.

## 6. Clone và chạy dự án

```bash
git clone https://github.com/boicongnghe/food-delivery-system.git
cd food-delivery-system

cd server
npm install
cp .env.example .env
npm run dev
```

Mở terminal thứ hai:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Kiểm tra:

- API: <http://localhost:5000/api/health> trả về `{"success":true,...}`
- Giao diện: <http://localhost:5173>

## 7. Xử lý lỗi thường gặp

### Port bị chiếm – `EADDRINUSE: address already in use :::5000`

Có tiến trình khác đang dùng port. Tìm và tắt:

```bash
netstat -ano | findstr :5000
taskkill //PID <PID> //F
```

(Trong Git Bash phải viết `//PID`, `//F`.) Hoặc đổi `PORT` trong `server/.env` – nhớ đổi luôn `VITE_API_URL` trong `client/.env`.

### Không kết nối được MongoDB – `MongoDB connection error: connect ECONNREFUSED 127.0.0.1:27017`

- MongoDB local chưa chạy: mở **Services** (`Win + R` → `services.msc`) → tìm **MongoDB Server** → *Start*.
- Dùng Atlas: kiểm tra IP đã được thêm vào **Network Access**, user/password đúng, mật khẩu có ký tự đặc biệt thì phải URL-encode.
- Kiểm tra lại `MONGO_URI` trong `server/.env`.

### Quên tạo `.env`

Dấu hiệu: server báo lỗi `The uri parameter to openUri() must be a string, got "undefined"`, hoặc client gọi API tới `undefined/...`.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Sau khi sửa `client/.env` phải **tắt và chạy lại** `npm run dev` (Vite chỉ đọc env lúc khởi động).

### `Cannot find native binding` khi chạy client

Node quá cũ cho Vite 8. Nâng Node lên `22.12+`, rồi cài lại:

```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

> Lưu ý: chỉ xóa `package-lock.json` khi thật cần; nếu xóa thì báo nhóm và commit lock file mới trong một PR riêng.

### CORS error trên trình duyệt

`CLIENT_URL` trong `server/.env` phải trùng chính xác địa chỉ client (mặc định `http://localhost:5173`, không có `/` ở cuối).

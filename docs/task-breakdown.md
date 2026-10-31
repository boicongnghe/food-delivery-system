# Chia module và task

Gợi ý chia công việc cho nhóm 4–6 người. Mỗi dòng task dưới đây có thể tạo thành **một GitHub Issue** (một PR). Gắn label theo module (`module:auth`, `module:order`...) và loại (`backend`, `frontend`).

Mỗi module nên có 1 người phụ trách chính (owner), làm cả backend lẫn frontend của module để hiểu trọn luồng.

## Giai đoạn 0 – Nền tảng (Tech Lead, làm trước)

- [x] Dựng khung dự án, tài liệu, template GitHub
- [ ] Chốt thiết kế CSDL trong `docs/database.md`
- [ ] Chốt danh sách endpoint của từng module
- [ ] Middleware `protect` (xác thực JWT) và `authorize(...roles)` (phân quyền)
- [ ] Thêm thư viện validate input (đề xuất, nhóm duyệt)
- [ ] Wireframe các màn hình chính

## Module 1 – Auth & User

- [ ] Model `User` (hash password bằng bcrypt)
- [ ] API đăng ký (`POST /api/auth/register`)
- [ ] API đăng nhập trả JWT (`POST /api/auth/login`)
- [ ] API lấy/cập nhật thông tin cá nhân (`GET/PUT /api/users/me`)
- [ ] API đổi mật khẩu
- [ ] Trang đăng ký, đăng nhập
- [ ] `AuthContext` + lưu token, tự đăng xuất khi token hết hạn (401)
- [ ] `ProtectedRoute` theo role ở client
- [ ] Trang hồ sơ cá nhân, quản lý địa chỉ giao hàng

## Module 2 – Restaurant & Menu

- [ ] Model `Restaurant`, `MenuItem`
- [ ] API CRUD nhà hàng cho `restaurant_owner`
- [ ] API CRUD món ăn của nhà hàng
- [ ] API danh sách nhà hàng công khai (tìm kiếm, phân trang)
- [ ] API chi tiết nhà hàng + menu
- [ ] Trang danh sách nhà hàng, tìm kiếm
- [ ] Trang chi tiết nhà hàng và menu
- [ ] Dashboard chủ nhà hàng: quản lý thông tin nhà hàng, quản lý món

## Module 3 – Cart & Order

- [ ] Giỏ hàng ở client (`CartContext`), chỉ cho phép món từ một nhà hàng
- [ ] Model `Order`
- [ ] API tạo đơn (tính tiền ở server, không tin giá từ client)
- [ ] API danh sách và chi tiết đơn của customer
- [ ] API hủy đơn (theo quy tắc trạng thái)
- [ ] API nhà hàng xác nhận/chuẩn bị đơn
- [ ] Trang giỏ hàng, checkout
- [ ] Trang lịch sử đơn và theo dõi trạng thái đơn
- [ ] Model `Review` + API đánh giá sau khi đơn `delivered`

## Module 4 – Shipper & Delivery

- [ ] API danh sách đơn sẵn sàng giao
- [ ] API shipper nhận đơn
- [ ] API cập nhật trạng thái giao (`delivering` → `delivered`)
- [ ] API lịch sử giao hàng, thống kê thu nhập
- [ ] Trang shipper: danh sách đơn có thể nhận
- [ ] Trang shipper: đơn đang giao, cập nhật trạng thái
- [ ] Trang shipper: lịch sử giao hàng

## Module 5 – Admin Dashboard

- [ ] API quản lý người dùng (danh sách, khóa/mở)
- [ ] API duyệt / từ chối / đình chỉ nhà hàng
- [x] API xem toàn bộ đơn hàng
- [ ] API thống kê (số đơn, doanh thu theo ngày/tháng, top nhà hàng)
- [ ] `AdminLayout` + trang tổng quan thống kê
- [ ] Trang quản lý người dùng
- [ ] Trang quản lý nhà hàng
- [x] Trang quản lý đơn hàng (chỉ xem)

## Việc chung (cuối mỗi sprint)

- [ ] Seed dữ liệu mẫu để demo
- [ ] Viết tài liệu API (Postman collection)
- [ ] Kiểm thử luồng end-to-end: đăng ký → đặt món → nhà hàng xác nhận → shipper giao → review
- [ ] Release `develop` → `main`, gắn tag

## Gợi ý phân công

| Số người | Phân công |
| --- | --- |
| 4 | Tech Lead + Auth/Admin · Restaurant & Menu · Cart & Order · Shipper & Delivery |
| 5 | Tech Lead + Auth · Restaurant & Menu · Cart & Order · Shipper & Delivery · Admin |
| 6 | Như 5 người + 1 người chuyên UI/UX dùng chung (components, layout, responsive) và test |

Thứ tự phụ thuộc: **Auth → Restaurant & Menu → Cart & Order → Shipper → Admin**. Các module sau có thể làm song song phần giao diện bằng dữ liệu giả trong lúc chờ API.

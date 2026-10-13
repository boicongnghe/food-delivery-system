## Mô tả thay đổi

<!-- Tóm tắt ngắn gọn PR này làm gì và tại sao. -->

## Issue liên quan

Closes #

## Loại thay đổi

- [ ] `feat` – Tính năng mới
- [ ] `fix` – Sửa lỗi
- [ ] `docs` – Tài liệu
- [ ] `style` – Format code, không đổi logic
- [ ] `refactor` – Tái cấu trúc code
- [ ] `test` – Thêm/sửa test
- [ ] `chore` – Cấu hình, dependencies

## Cách test

<!-- Các bước để reviewer kiểm tra lại. Ví dụ:
1. Chạy server: `cd server && npm run dev`
2. Gọi `POST /api/auth/login` với body {...}
3. Kết quả mong đợi: 200, trả về token
-->

1.
2.
3.

## Ảnh chụp màn hình (nếu là UI)

<!-- Kéo thả ảnh vào đây. Nếu sửa giao diện, nên có ảnh trước/sau. -->

## Checklist

- [ ] Đã pull `develop` mới nhất và merge vào nhánh này
- [ ] PR vào nhánh `develop` (không phải `main`)
- [ ] Đã tự test, server chạy được và `cd client && npm run build` pass
- [ ] Không có `console.log` thừa, không có code comment-out
- [ ] Không commit `.env`, `node_modules/`, `dist/`
- [ ] Đã cập nhật `.env.example` / tài liệu nếu có thay đổi liên quan
- [ ] Commit message theo Conventional Commits

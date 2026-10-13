# Hướng dẫn đóng góp

Cảm ơn bạn đã đóng góp cho dự án! Đọc kỹ file này trước khi bắt đầu code.

## Quy trình tóm tắt

1. **Nhận task** – mỗi task là một GitHub Issue. Tự assign issue cho mình trước khi làm.
2. **Cập nhật `develop`** – `git checkout develop && git pull origin develop`.
3. **Tạo nhánh** – `git checkout -b feature/<module>-<mo-ta-ngan>` (ví dụ `feature/auth-login`).
4. **Code + commit** theo [Conventional Commits](docs/git-workflow.md#3-commit-message-conventional-commits), commit nhỏ và thường xuyên.
5. **Tự test** – chạy server, client, `npm run build` ở `client/` phải pass.
6. **Push và mở Pull Request vào `develop`** – điền đầy đủ PR template, ghi `Closes #<số issue>`.
7. **Review** – cần tối thiểu **1 approval** từ thành viên khác. Sửa theo góp ý rồi push tiếp lên cùng nhánh.
8. **Merge** – người review (không phải tác giả) merge PR, sau đó xóa nhánh.

## Quy tắc bắt buộc

- Không push thẳng lên `main` hoặc `develop`.
- Không force push lên nhánh chung.
- Không commit `.env`, `node_modules/`, `dist/`.
- Không tự merge PR của chính mình.
- Không tự ý thêm thư viện lớn – hỏi Tech Lead trước.
- Tuân thủ [quy ước code](docs/coding-convention.md) và [quy ước API](docs/api-convention.md).

## Tài liệu chi tiết

- Git workflow đầy đủ: [docs/git-workflow.md](docs/git-workflow.md)
- Cài đặt môi trường: [docs/setup.md](docs/setup.md)
- Kiến trúc: [docs/architecture.md](docs/architecture.md)

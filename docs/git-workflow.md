# Git Workflow

Quy trình làm việc với Git/GitHub cho cả nhóm. **Bắt buộc tuân thủ.**

## 1. Mô hình nhánh

```
main      ●─────────────────────●──────────────  (ổn định, dùng để demo/nộp bài, gắn tag)
           \                   /
develop     ●───●───●───●─────●───●───●────────  (nhánh tích hợp, mọi PR vào đây)
                 \     / \       /
feature/*         ●───●   ●─────●                (mỗi task một nhánh)
```

| Nhánh        | Mục đích                                         | Tạo từ    | Merge vào |
| ------------ | ------------------------------------------------ | --------- | --------- |
| `main`       | Code ổn định, chỉ cập nhật khi release/demo      | –         | –         |
| `develop`    | Tích hợp các tính năng đã review                 | `main`    | `main`    |
| `feature/*`  | Tính năng mới                                    | `develop` | `develop` |
| `fix/*`      | Sửa lỗi                                          | `develop` | `develop` |
| `docs/*`     | Cập nhật tài liệu                                | `develop` | `develop` |
| `refactor/*` | Tái cấu trúc code, không đổi hành vi             | `develop` | `develop` |

## 2. Đặt tên nhánh

Cú pháp: `<loai>/<module>-<mo-ta-ngan>` – chữ thường, không dấu, nối bằng gạch ngang.

| Ví dụ đúng                        | Ví dụ sai                  |
| --------------------------------- | -------------------------- |
| `feature/auth-login`              | `Feature/Login`            |
| `feature/order-create-order`      | `nam-dev`                  |
| `fix/cart-wrong-total-price`      | `fix_bug`                  |
| `docs/api-convention-pagination`  | `feature/đăng-nhập`        |
| `refactor/restaurant-service`     | `test123`                  |

## 3. Commit message (Conventional Commits)

Cú pháp:

```
<type>(<scope>): <mo ta ngan bang tieng Anh, thi hien tai, chu thuong>
```

| Type       | Khi nào dùng                                         |
| ---------- | ---------------------------------------------------- |
| `feat`     | Thêm tính năng mới                                   |
| `fix`      | Sửa lỗi                                              |
| `docs`     | Chỉ thay đổi tài liệu                                |
| `style`    | Format code, khoảng trắng, dấu chấm phẩy (không đổi logic) |
| `refactor` | Tái cấu trúc code, không thêm tính năng, không sửa lỗi |
| `test`     | Thêm/sửa test                                        |
| `chore`    | Cấu hình, dependencies, script build                 |

Ví dụ:

```bash
git commit -m "feat(auth): add login API with JWT"
git commit -m "feat(menu): add menu item list page"
git commit -m "fix(order): correct total price when quantity changes"
git commit -m "docs(readme): update setup instructions"
git commit -m "style(client): format header component"
git commit -m "refactor(restaurant): move query logic to service"
git commit -m "test(auth): add tests for register service"
git commit -m "chore(server): add express-validator dependency"
```

Nguyên tắc: mỗi commit một thay đổi có ý nghĩa; không commit kiểu `update`, `fix bug`, `aaa`.

## 4. Quy trình hằng ngày

```bash
# 1. Về develop và lấy code mới nhất
git checkout develop
git pull origin develop

# 2. Tạo nhánh cho task (một lần cho mỗi task)
git checkout -b feature/auth-login

# 3. Code... rồi kiểm tra thay đổi
git status
git diff

# 4. Commit (chỉ add đúng file liên quan)
git add server/src/controllers/authController.js server/src/services/authService.js
git commit -m "feat(auth): add login API with JWT"

# 5. Push nhánh lên GitHub (lần đầu dùng -u)
git push -u origin feature/auth-login
# các lần sau chỉ cần: git push

# 6. Lên GitHub mở Pull Request: base = develop, compare = feature/auth-login
```

Sau khi PR được merge:

```bash
git checkout develop
git pull origin develop
git branch -d feature/auth-login        # xóa nhánh local
```

## 5. Cập nhật nhánh feature khi `develop` thay đổi

Khi người khác đã merge vào `develop`, cập nhật nhánh của bạn **trước khi mở PR** và khi PR báo conflict:

```bash
git checkout develop
git pull origin develop
git checkout feature/auth-login
git merge develop
git push
```

> Nhóm dùng `merge` (không dùng `rebase`) để tránh phải force push.

### Xử lý conflict cơ bản

Khi `git merge develop` báo `CONFLICT`:

1. Xem file bị conflict: `git status` (mục *both modified*).
2. Mở file trong VS Code, tìm các đoạn:

   ```
   <<<<<<< HEAD
   code của bạn
   =======
   code từ develop
   >>>>>>> develop
   ```

3. Chọn *Accept Current* / *Accept Incoming* / *Accept Both* hoặc tự sửa tay, **xóa hết** các dấu `<<<<<<<`, `=======`, `>>>>>>>`.
4. Chạy lại server/client để chắc chắn code vẫn hoạt động.
5. Hoàn tất:

   ```bash
   git add <file-da-sua>
   git commit            # Git tự tạo message "Merge branch 'develop' ..."
   git push
   ```

Không chắc thì hỏi người viết đoạn code kia, **không xóa code của người khác khi chưa hiểu**. Muốn hủy merge: `git merge --abort`.

## 6. Quy tắc Pull Request

- **Nhỏ**: 1 PR = 1 task (1 issue). Nên dưới ~400 dòng thay đổi.
- **Base luôn là `develop`** (trừ PR release).
- **Tự test trước khi mở PR**: server chạy được, client `npm run build` pass, đã thử tính năng trên trình duyệt/Postman.
- Điền đầy đủ PR template, ghi `Closes #<số issue>` để issue tự đóng khi merge.
- **Tối thiểu 1 approval** từ thành viên khác.
- **Không merge PR của chính mình.** Người review approve xong thì merge.
- Dùng **Squash and merge** để lịch sử `develop` gọn (mỗi PR thành 1 commit).
- Xóa nhánh sau khi merge (GitHub có nút *Delete branch*).
- Reviewer phản hồi trong vòng 24 giờ.

## 7. Những điều cấm

- ❌ Push thẳng lên `main` hoặc `develop`.
- ❌ `git push --force` lên nhánh chung (`main`, `develop`, nhánh người khác đang làm).
- ❌ Commit `.env`, `node_modules/`, `dist/`, file chứa mật khẩu/API key.
- ❌ `git add .` khi chưa xem `git status`.
- ❌ Merge PR của chính mình, merge khi chưa có approval.
- ❌ Gộp nhiều task không liên quan vào một PR.

Lỡ commit `.env`? Báo Tech Lead ngay – cần đổi toàn bộ secret trong file đó, không chỉ xóa file.

## 8. Quy trình release

Khi đến mốc demo/nộp bài:

1. Đảm bảo `develop` đã ổn định, cả nhóm đã test.
2. Tech Lead mở PR **`develop` → `main`**, tiêu đề `release: v0.1.0`, dùng **Create a merge commit** (không squash).
3. Sau khi merge, gắn tag:

   ```bash
   git checkout main
   git pull origin main
   git tag -a v0.1.0 -m "Release v0.1.0: sprint 1 demo"
   git push origin v0.1.0
   ```

4. Tạo GitHub Release từ tag, ghi tóm tắt tính năng.

Đánh số phiên bản: `v0.1.0`, `v0.2.0`... cho mỗi mốc demo; `v0.1.1` cho bản sửa lỗi gấp; `v1.0.0` cho bản nộp cuối cùng.

### Sửa lỗi gấp trên `main` (hotfix)

Tạo `fix/*` từ `main`, mở PR vào `main`, sau đó merge `main` ngược về `develop` để hai nhánh đồng bộ.

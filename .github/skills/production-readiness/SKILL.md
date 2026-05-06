---
name: production-readiness
description: "Đánh giá % production readiness của dự án REVA, liệt kê action items còn thiếu theo priority, và cập nhật tracking log sau mỗi bước. Dùng khi: 'kiểm tra production readiness', 'report production', 'deploy checklist', 'ready to ship', 'production audit', 'production score', 'báo cáo sẵn sàng production', 'tiến độ production'."
argument-hint: "Tùy chọn: tên category cần audit (security | testing | infrastructure | monitoring | performance | frontend | docs | data). Mặc định audit toàn bộ."
---

# Production Readiness Skill — REVA

Skill này đánh giá trạng thái production-readiness của hệ thống REVA theo 8 categories, tính điểm % tổng hợp, và duy trì một tracking log cập nhật sau mỗi lần audit hoặc mỗi khi một action item được hoàn thành.

---

## Khi nào dùng

- Người dùng hỏi "production ready chưa?" / "deploy được chưa?" / "còn thiếu gì?"
- Sau khi hoàn thành một tính năng lớn / fix một nhóm lỗi
- Trước milestone, demo, hoặc deployment
- Khi muốn cập nhật trạng thái một checklist item

---

## Workflow (4 bước)

### Bước 1 — Đọc trạng thái hiện tại

Đọc file tracking: [current-state.md](./references/current-state.md)

Nếu file chưa tồn tại, khởi tạo từ template trong file này.

### Bước 2 — Scan codebase

Dùng search tools để verify trạng thái thực tế của từng checklist item. Đọc [checklist.md](./references/checklist.md) để biết cách verify từng item.

**Ưu tiên verify:**
- Các item đã đánh dấu `[ ]` (chưa done)
- Các item được người dùng vừa đề cập là đã hoàn thành

### Bước 3 — Tính điểm và sinh report

Tính điểm theo công thức:

```
Score = (tổng điểm đạt được / tổng điểm tối đa) × 100%
```

Mỗi item `[x]` = điểm weight của item đó (xem checklist.md).
Tổng điểm tối đa = tổng tất cả weights.

**Format output:**

```
## Production Readiness Report — REVA
📅 [Ngày audit]

### Tổng điểm: XX% ████████░░ (N/M điểm)

| Category          | Điểm  | Tiến độ     |
|-------------------|-------|-------------|
| 🔒 Security       | 12/15 | ████████░░  |
| 🧪 Testing        |  6/10 | ██████░░░░  |
| ...               |       |             |

### ❌ Critical (phải xong trước deploy)
- [ ] Item A — lý do critical
- [ ] Item B

### ⚠️ Important (nên xong sớm)
- [ ] Item C
- [ ] Item D

### 💡 Nice-to-have
- [ ] Item E
```

### Bước 4 — Cập nhật tracking log

Sau khi report, cập nhật file [current-state.md](./references/current-state.md):
- Thay đổi `[ ]` → `[x]` cho các item đã verify là done
- Thêm dòng vào **Changelog** với ngày + mô tả thay đổi
- Cập nhật dòng `Last audit:` và `Score:`

---

## Categories & Weights

Xem chi tiết từng item trong [checklist.md](./references/checklist.md).

| Category          | Max Score | Priority |
|-------------------|-----------|----------|
| 🔒 Security       | 15        | Critical |
| 🧪 Testing        | 10        | Critical |
| 🏗️ Infrastructure | 12        | Critical |
| 📊 Monitoring     | 8         | Important |
| ⚡ Performance    | 8         | Important |
| 🎨 Frontend UX    | 7         | Important |
| 📄 Documentation  | 5         | Nice-to-have |
| 🗄️ Data & DB      | 5         | Important |
| **TOTAL**         | **70**    |          |

**Mốc đánh giá:**
- < 50%: ❌ Not ready — rủi ro cao khi deploy
- 50–69%: ⚠️ Partial — deploy với rủi ro, cần action plan rõ ràng
- 70–84%: 🟡 Almost ready — fix critical items còn lại
- 85–94%: 🟢 Ready — có thể deploy, tiếp tục improve
- ≥ 95%: ✅ Production-grade

---

## Cách cập nhật sau khi hoàn thành 1 action item

Khi người dùng báo "tôi vừa xong [item X]":

1. Verify bằng cách đọc code thực tế
2. Nếu confirm done → cập nhật `[x]` trong current-state.md
3. Thêm vào Changelog
4. Tính lại score
5. In ra diff: `Score: XX% → YY% (+Z điểm)`

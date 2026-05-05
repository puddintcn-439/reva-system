# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG REVA
## Phiên bản dành cho vận hành thực tế (Production)

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Trang dành cho khách hàng (Public)](#2-trang-dành-cho-khách-hàng-public)
3. [Đăng nhập hệ thống quản trị](#3-đăng-nhập-hệ-thống-quản-trị)
4. [Phân quyền người dùng](#4-phân-quyền-người-dùng)
5. [Tổng quan (Dashboard)](#5-tổng-quan-dashboard)
6. [Bán hàng tại quầy (POS)](#6-bán-hàng-tại-quầy-pos)
7. [Lịch sử bán hàng & Hoàn trả](#7-lịch-sử-bán-hàng--hoàn-trả)
8. [Khách hàng mua](#8-khách-hàng-mua)
9. [Quản lý sản phẩm](#9-quản-lý-sản-phẩm)
10. [Khách hàng ký gửi (Consignors)](#10-khách-hàng-ký-gửi-consignors)
11. [Yêu cầu ký gửi (Consignments)](#11-yêu-cầu-ký-gửi-consignments)
12. [Thu mua (Purchases)](#12-thu-mua-purchases)
13. [Quyết toán (Settlements)](#13-quyết-toán-settlements)
14. [Cài đặt hệ thống (Settings)](#14-cài-đặt-hệ-thống-settings)
15. [Quản lý tài khoản (Users)](#15-quản-lý-tài-khoản-users)
16. [Quy trình nghiệp vụ đầu cuối](#16-quy-trình-nghiệp-vụ-đầu-cuối)
17. [Câu hỏi thường gặp & Xử lý sự cố](#17-câu-hỏi-thường-gặp--xử-lý-sự-cố)

---

## 1. Tổng quan hệ thống

**REVA** là nền tảng quản lý cửa hàng thanh lý ký gửi thời trang. Hệ thống bao gồm:

| Phần | Địa chỉ | Dành cho |
|------|---------|----------|
| Website công khai | `/` | Khách hàng tra cứu, đăng ký |
| Hệ thống quản trị | `/admin` | Nhân viên, quản lý, kế toán |

### Luồng nghiệp vụ chính

```
Khách đăng ký ký gửi
        ↓
Admin xét duyệt → Nhận hàng → Tạo sản phẩm
        ↓
Bán hàng qua POS (quét mã / tìm kiếm)
        ↓
Tạo quyết toán → Khách tra cứu → Chuyển khoản
```

### Bảng hoa hồng mặc định

| Giá bán | Hoa hồng REVA | Khách nhận |
|---------|--------------|-----------|
| Dưới 60.000đ | 20.000đ cố định | Giá bán − 20.000đ |
| 60.000đ – 130.000đ | 30.000đ cố định | Giá bán − 30.000đ |
| Trên 130.000đ | 25% giá bán | 75% giá bán |

> Hoa hồng có thể điều chỉnh trong **Cài đặt → Commission**.

---

## 2. Trang dành cho khách hàng (Public)

Khách hàng truy cập website mà **không cần đăng nhập**.

### 2.1 Đăng ký ký gửi (`/consign`)

Khách hàng điền form để gửi yêu cầu ký gửi:

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Họ tên | ✅ | |
| Số điện thoại | ✅ | Dùng để tra cứu về sau |
| Email | — | Nhận thông báo tự động |
| Loại yêu cầu | ✅ | **Mang đến trực tiếp** hoặc **Gửi qua bưu chính** |
| Chi nhánh | — | Khi chọn "trực tiếp" |
| Ngày hẹn | — | Khi chọn "trực tiếp" |
| Ghi chú | — | Mô tả sơ bộ đồ muốn ký gửi |

**Điều kiện nhận hàng:**
- Tối thiểu 5 sản phẩm
- Tình trạng ≥ 90%
- Quần áo mùa phù hợp (hè: tháng 5–8, đông: tháng 9–1)
- Sạch sẽ, không ố vàng, không mùi

Sau khi gửi, hệ thống sẽ:
1. Tạo bản ghi yêu cầu ký gửi (trạng thái: `pending`)
2. Tự động tạo hồ sơ khách hàng nếu chưa có

### 2.2 Đăng ký thu mua (`/buy`)

Khách hàng muốn bán đồ cho REVA:

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Họ tên | ✅ | |
| Số điện thoại | ✅ | |
| Email | — | |
| Loại hàng | ✅ | Không nhãn / Có nhãn / Phụ kiện |
| Số lượng (kg) | — | Ước tính |
| Mô tả | — | Chi tiết về hàng |

**Bảng giá mua vào tham khảo:**
- Quần áo không nhãn: 80.000 – 100.000đ/kg
- Quần áo có nhãn: 150.000 – 200.000đ/kg
- Phụ kiện: Báo giá theo món

### 2.3 Tra cứu quyết toán (`/sales`)

Khách hàng nhập **một trong ba** thông tin để tra cứu:
- Mã khách hàng (ví dụ: `HUN-123456`)
- Mã quyết toán (ví dụ: `QT-12345678`)
- Số điện thoại đã đăng ký

Kết quả hiển thị:
- Trạng thái quyết toán (Chờ thanh toán / Đã thanh toán / Đã hủy)
- Kỳ quyết toán (từ ngày → đến ngày)
- Tổng doanh thu bán ra
- Hoa hồng REVA thu
- Số tiền REVA sẽ trả
- Chi tiết từng sản phẩm đã bán

---

## 3. Đăng nhập hệ thống quản trị

Truy cập: `/admin/login`

| Trường | Ghi chú |
|--------|---------|
| Tên đăng nhập | Do admin tạo |
| Mật khẩu | Do admin cấp lúc tạo tài khoản |

**Lưu ý bảo mật:**
- Tối đa **10 lần đăng nhập sai trong 15 phút** — sau đó tạm khóa IP
- Hệ thống dùng **access token (1 giờ) + refresh token (30 ngày)** lưu trong trình duyệt — token tự động làm mới khi gần hết hạn
- Đóng tab không tự đăng xuất — phải nhấn **Đăng xuất** để thu hồi token hoàn toàn

**Sau khi đăng nhập**, hệ thống tự chuyển đến trang phù hợp nhất với quyền của bạn:
- Có `dashboard:view` → Tổng quan
- Có `pos:sale` → POS bán hàng
- Còn lại → Sản phẩm

---

## 4. Phân quyền người dùng

### Danh sách vai trò

| Vai trò | Tiếng Việt | Quyền hạn chính |
|---------|------------|-----------------|
| `superadmin` | Siêu quản trị | Toàn bộ hệ thống |
| `admin` | Quản trị viên | Toàn bộ hệ thống |
| `manager` | Quản lý | Hầu hết tính năng, trừ cài đặt hệ thống |
| `staff` | Nhân viên | Vận hành hàng ngày |
| `cashier` | Thu ngân | Chỉ POS và lịch sử bán hàng |
| `accountant` | Kế toán | Xem báo cáo tài chính, quyết toán |
| `inventory` | Quản lý kho | Sản phẩm, ký gửi |
| `viewer` | Chỉ xem | Xem thông tin, không chỉnh sửa |

### Ma trận quyền (tham khảo)

| Tính năng | admin | manager | staff | cashier | accountant | inventory | viewer |
|-----------|:-----:|:-------:|:-----:|:-------:|:----------:|:---------:|:------:|
| Dashboard | ✅ | ✅ | — | — | ✅ | — | — |
| POS bán hàng | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Lịch sử bán hàng | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Sản phẩm (xem) | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| Sản phẩm (sửa) | ✅ | ✅ | ✅ | — | — | ✅ | — |
| Khách ký gửi | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Yêu cầu ký gửi | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| Thu mua | ✅ | ✅ | ✅ | — | — | — | ✅ |
| Quyết toán (xem) | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| Quyết toán (tạo/thanh toán) | ✅ | ✅ | — | — | ✅ | — | — |
| Cài đặt | ✅ | — | — | — | — | — | — |
| Quản lý tài khoản | ✅ | — | — | — | — | — | — |

> Quyền cụ thể được cấu hình trong database bảng `role_permissions`. Admin có thể điều chỉnh.

---

## 5. Tổng quan (Dashboard)

**Yêu cầu quyền:** `dashboard:view`

### 5.1 Thẻ KPI

Bốn thẻ ở đầu trang hiển thị số liệu thời gian thực (cập nhật mỗi 30 giây):

| Thẻ | Nội dung |
|-----|---------|
| Sản phẩm đang bán | Số lượng `active` + Số đã bán (`sold`) |
| Khách hàng ký gửi | Tổng số khách trong hệ thống |
| Quyết toán chờ | Số bản ghi `pending` + Tổng tiền cần trả |
| Yêu cầu ký gửi | Số yêu cầu `pending` chưa xử lý |

Nhấn vào thẻ để chuyển đến trang chi tiết tương ứng.

### 5.2 Thanh doanh thu tổng

Dải tối phía dưới thẻ KPI hiển thị toàn bộ lịch sử:
- **Tổng bán ra**: Tổng `sale_price` của tất cả sản phẩm đã bán
- **REVA thu**: Tổng hoa hồng tích lũy
- **Trả khách hàng**: Tổng `consignor_amount` cần trả / đã trả

### 5.3 Biểu đồ báo cáo

**Bộ lọc thời gian:**
- Toggle **Theo ngày / Theo tháng**
- Dropdown: **1 / 3 / 6 / 12 tháng** gần nhất

**Biểu đồ doanh thu (đường):** So sánh 3 đường: Tổng bán ra, REVA thu, Trả khách hàng theo thời gian.

**Doanh thu theo danh mục (cột ngang):** Top 8 danh mục có doanh thu cao nhất trong kỳ.

**Top 10 khách hàng ký gửi:** Xếp hạng theo doanh thu, kèm số sản phẩm, hoa hồng và số tiền trả.

---

## 6. Bán hàng tại quầy (POS)

**Yêu cầu quyền:** `pos:sale`  
**Đường dẫn:** `/admin/pos`

### 6.1 Giao diện và Tab bán hàng

POS hỗ trợ tối đa **5 đơn hàng song song** (5 tab). Mỗi tab là một đơn hàng độc lập.

- **Tạo tab mới:** Nhấn nút `+` bên cạnh các tab hiện có
- **Đóng tab:** Nhấn `×` trên tab (xóa đơn chưa hoàn thành)
- **Chuyển tab:** Nhấn trực tiếp vào tab cần làm việc

### 6.2 Thêm sản phẩm vào giỏ

**Cách 1 – Quét mã vạch:**
1. Đặt con trỏ vào ô tìm kiếm
2. Dùng máy quét mã vạch quét barcode trên nhãn sản phẩm
3. Sản phẩm tự động thêm vào giỏ

**Cách 2 – Tìm kiếm thủ công:**
1. Nhập tên hoặc mã sản phẩm vào ô tìm kiếm (tối thiểu 2 ký tự)
2. Chọn sản phẩm từ danh sách gợi ý

**Thông tin hiển thị trong giỏ:**
- Tên sản phẩm, mã SP, danh mục
- Tình trạng (%)
- Giá bán
- Hoa hồng REVA
- Số tiền trả cho khách ký gửi
- Nút xóa khỏi giỏ

> **Lưu ý:** Chỉ sản phẩm có trạng thái `active` mới được thêm vào giỏ.

### 6.3 Thông tin khách hàng

- **Tìm khách có sẵn:** Nhập 3+ chữ số điện thoại → hệ thống gợi ý khách đã mua trước đây
- **Khách mới:** Nhập tên + số điện thoại trực tiếp
- **Khách vãng lai:** Để trống (hệ thống ghi là "Khách")

### 6.4 Giảm giá

- Nhập số tiền giảm trực tiếp vào ô **Giảm giá**
- Hệ thống tự tính **Thành tiền = Tổng − Giảm giá**
- Giảm giá không thể vượt quá tổng đơn hàng, không nhận số âm

### 6.5 Phương thức thanh toán

| Phương thức | Hiển thị | Ghi chú |
|-------------|---------|---------|
| **Tiền mặt** | Số tiền cần thu | Nhập tiền khách đưa → tự tính tiền thừa |
| **Chuyển khoản** | QR code VietQR | Dùng tài khoản ngân hàng mặc định trong Cài đặt |
| **Hỗn hợp** | Chia tiền mặt + chuyển khoản | Nhập phần tiền mặt, phần còn lại hiện QR |

**Cấu hình tài khoản ngân hàng cho QR:** Vào **Cài đặt → Ngân hàng** và đánh dấu một tài khoản là mặc định.

### 6.6 Hoàn thành đơn hàng

1. Kiểm tra lại giỏ hàng, khách hàng, phương thức thanh toán
2. Nhấn **Tạo đơn hàng**
3. Hệ thống sinh mã hóa đơn tự động (ví dụ: `INV-2026050412345`)
4. Popup xuất hiện với biên lai và các tùy chọn:
   - **In biên lai** — Mở hộp thoại in của trình duyệt
   - **Lưu PDF** — Tải về máy tính
5. Tab tự động đóng sau khi hoàn thành

**Trạng thái đơn hàng mới tạo:**
- Nếu thanh toán ngay: `paid`
- Nếu chưa thu tiền: `pending` (có thể xác nhận sau trong Lịch sử)

### 6.7 Lưu ý quan trọng về POS

- Mỗi sản phẩm chỉ được bán **một lần** — hệ thống kiểm tra trạng thái khi tạo đơn
- Nếu sản phẩm bị bán đồng thời từ hai quầy: đơn thứ hai sẽ báo lỗi `sản phẩm không còn`
- Tối đa **100 sản phẩm** trong một đơn hàng

---

## 7. Lịch sử bán hàng & Hoàn trả

**Yêu cầu quyền:** `pos:history`  
**Đường dẫn:** `/admin/sales-history`

### 7.1 Tìm kiếm và lọc

- Tìm theo: Mã hóa đơn, tên khách hàng, số điện thoại
- Phân trang: 20 bản ghi mỗi trang

### 7.2 Trạng thái đơn hàng

| Trạng thái | Màu | Ý nghĩa |
|------------|-----|---------|
| `pending` | Vàng | Đơn chưa thu tiền |
| `paid` | Xanh lá | Đã thu tiền, hoàn thành |
| `cancelled` | Đỏ | Đã hủy |

### 7.3 Chi tiết đơn hàng

Nhấn vào dòng đơn hàng để xem chi tiết:
- Thông tin hóa đơn: mã, ngày giờ, nhân viên tạo, chi nhánh
- Thông tin khách hàng
- Danh sách sản phẩm trong đơn
- Phương thức thanh toán, tham chiếu thanh toán
- Lịch sử hoàn trả (nếu có)

**Các hành động có thể thực hiện:**

| Hành động | Điều kiện | Kết quả |
|-----------|-----------|---------|
| **In biên lai** | Mọi đơn | Mở hộp thoại in |
| **Lưu PDF** | Mọi đơn | Tải file về máy |
| **Xác nhận thanh toán** | Đơn `pending` | Chuyển sang `paid` |
| **Hủy đơn** | Đơn `pending` | Chuyển sang `cancelled`, hoàn trạng thái sản phẩm |
| **Tạo hoàn trả** | Đơn `paid` | Tạo phiếu hoàn hàng |

### 7.4 Tạo phiếu hoàn trả

1. Mở chi tiết đơn hàng `paid`
2. Nhấn **Tạo hoàn trả**
3. Điền thông tin:
   - **Chọn sản phẩm** cần hoàn (tích chọn từng món)
   - **Số tiền hoàn lại** (mặc định = tổng giá các món được chọn, có thể điều chỉnh)
   - **Lý do hoàn hàng** (bắt buộc)
4. Nhấn **Xác nhận hoàn trả**

**Sau khi hoàn trả:**
- Sản phẩm được hoàn về trạng thái `returned`
- Phiếu hoàn trả lưu trong lịch sử đơn hàng

> **Lưu ý:** Mỗi sản phẩm chỉ được hoàn trả **một lần**. Số tiền hoàn không được vượt quá giá trị đơn hàng.

---

## 8. Khách hàng mua

**Yêu cầu quyền:** `pos:history`  
**Đường dẫn:** `/admin/customers`

Danh sách khách hàng được **tự động tạo** khi bán hàng qua POS (theo số điện thoại).

### 8.1 Danh sách khách hàng

| Cột | Nội dung |
|-----|---------|
| Tên | Tên khách hàng |
| Số điện thoại | |
| Số lần mua | Badge màu xanh |
| Tổng chi tiêu | Tổng tiền tất cả đơn hàng |
| Lần mua gần nhất | |

### 8.2 Chi tiết khách hàng

- **Thống kê nhanh:** Số lần mua, tổng chi tiêu, ngày mua cuối
- **Lịch sử giao dịch:** Toàn bộ đơn hàng kèm trạng thái thanh toán

---

## 9. Quản lý sản phẩm

**Yêu cầu quyền:** `products:view` (xem) / `products:manage` (sửa)  
**Đường dẫn:** `/admin/products`

### 9.1 Trạng thái sản phẩm

| Trạng thái | Ý nghĩa |
|------------|---------|
| `active` | Đang trưng bày, có thể bán |
| `pending` | Chờ duyệt hoặc định giá |
| `sold` | Đã bán qua POS |
| `returned` | Trả lại cho khách ký gửi |
| `expired` | Quá hạn ký gửi |

### 9.2 Tìm kiếm và lọc

- Lọc theo **trạng thái**, **danh mục**, **khách ký gửi**, **khoảng giá**
- Kết quả phân trang 20 sản phẩm/trang

### 9.3 Tạo sản phẩm mới

Nhấn **+ Thêm sản phẩm**, điền các trường:

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Tên sản phẩm | ✅ | |
| Mã sản phẩm | — | Tự sinh nếu để trống (SP-XXXXXX) |
| Tình trạng (%) | — | 0–100; mặc định 90 |
| Giá bán | ✅ | Phải > 0 |
| Danh mục | — | |
| Chi nhánh | — | |
| Khách ký gửi | — | Liên kết để tính quyết toán |
| Ngày bắt đầu ký gửi | — | |
| Ngày kết thúc ký gửi | — | Mặc định +60 ngày |
| URL ảnh | — | Đường dẫn ảnh sản phẩm |
| Mô tả | — | |

Hệ thống **tự động tính** hoa hồng REVA và số tiền trả khách theo bảng giá hiện hành.

### 9.4 Thêm hàng loạt (Bulk)

1. Nhấn **Thêm hàng loạt**
2. Upload file CSV với các cột: `name`, `code`, `condition_percent`, `sale_price`, `category_id`, `location_id`, `consignor_id`, ...
3. Xem trước danh sách và xác nhận

### 9.5 In nhãn sản phẩm

- Tích chọn nhiều sản phẩm → nhấn **In nhãn**
- Hoặc nhấn icon nhãn ở từng dòng để in nhãn đơn lẻ
- Nhãn gồm: Tên SP, mã SP (mã vạch), giá bán, tình trạng

### 9.6 Đánh dấu hết hạn hàng loạt

Nhấn **Hết hạn batch** → Tất cả sản phẩm `active` có `consign_end` < hôm nay sẽ chuyển sang `expired`.

### 9.7 Chỉnh sửa và xóa sản phẩm

- **Sửa:** Nhấn icon bút chì → cập nhật các trường (trừ trạng thái `sold` — không thể đặt thủ công)
- **Trả hàng:** Nhấn icon hoàn trả → nhập lý do → sản phẩm chuyển sang `returned`
- **Xóa:** Chỉ xóa được khi sản phẩm không thuộc đơn hàng nào

---

## 10. Khách hàng ký gửi (Consignors)

**Yêu cầu quyền:** `consignors:view`  
**Đường dẫn:** `/admin/consignors`

### 10.1 Danh sách

- Tìm kiếm theo tên, số điện thoại, mã khách
- Xem số sản phẩm đang active và đã bán của từng khách

### 10.2 Chi tiết khách ký gửi

**Tab Thông tin:**
- Họ tên, SĐT, email, địa chỉ
- Mã khách hàng (để tra cứu quyết toán)

**Tab Ngân hàng** (dùng để tạo QR khi thanh toán):

| Trường | Ghi chú |
|--------|---------|
| Ngân hàng | Chọn từ danh sách ~20 ngân hàng VN |
| Số tài khoản | Số tài khoản người nhận |
| Tên tài khoản | Tên chủ tài khoản |

> Điền chính xác thông tin ngân hàng để hệ thống tự sinh QR khi tạo quyết toán.

**Tab Sản phẩm:** Toàn bộ sản phẩm của khách, lọc theo trạng thái.

**Tab Quyết toán:** Lịch sử quyết toán của khách, trạng thái và số tiền.

---

## 11. Yêu cầu ký gửi (Consignments)

**Yêu cầu quyền:** `consignments:view`  
**Đường dẫn:** `/admin/consignments`

### 11.1 Luồng xử lý yêu cầu

```
pending → approved → active → completed
                   ↘ rejected
                   ↘ cancelled
```

| Trạng thái | Ý nghĩa | Hành động tiếp theo |
|------------|---------|---------------------|
| `pending` | Mới gửi, chưa xem | Xét duyệt |
| `approved` | Đã duyệt, chờ khách | Đợi khách mang hàng đến |
| `active` | Đang tiếp nhận hàng | Tạo sản phẩm trong kho |
| `completed` | Hoàn thành | Đã nhận và niêm yết đủ |
| `rejected` | Từ chối | — |
| `cancelled` | Hủy | — |

### 11.2 Xử lý một yêu cầu

1. Nhấn vào hàng để mở **Chi tiết**
2. Xem thông tin: tên, SĐT, email, loại yêu cầu, chi nhánh, ngày hẹn, ghi chú của khách
3. Cập nhật **Trạng thái mới** từ dropdown
4. Nhập **Ghi chú nội bộ** (khách hàng không thấy)
5. Nhấn **Lưu**

**Khi duyệt (`approved`):** Hệ thống tự động gửi email thông báo đến khách (nếu có email và SMTP đã cấu hình).

### 11.3 Sau khi duyệt — Tạo sản phẩm

Khi khách mang hàng đến (trạng thái `active`):
1. Chuyển sang trang **Sản phẩm**
2. Tạo từng sản phẩm, liên kết với **khách ký gửi** tương ứng
3. Điền giá bán đã thỏa thuận
4. Cập nhật yêu cầu ký gửi sang `completed` khi hoàn tất

---

## 12. Thu mua (Purchases)

**Yêu cầu quyền:** `purchases:view`  
**Đường dẫn:** `/admin/purchases`

### 12.1 Luồng xử lý

```
pending → contacted → completed
        ↘ rejected
```

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Yêu cầu mới |
| `contacted` | Đã liên hệ khách |
| `completed` | Đã hoàn thành thu mua |
| `rejected` | Từ chối |

### 12.2 Xử lý yêu cầu thu mua

Tương tự yêu cầu ký gửi: nhấn vào dòng → xem thông tin → cập nhật trạng thái.

---

## 13. Quyết toán (Settlements)

**Yêu cầu quyền:** `settlements:view` (xem) / `settlements:manage` (tạo, thanh toán)  
**Đường dẫn:** `/admin/settlements`

### 13.1 Trạng thái quyết toán

| Trạng thái | Màu | Ý nghĩa |
|------------|-----|---------|
| `pending` | Vàng | Chờ thanh toán |
| `paid` | Xanh lá | Đã chuyển tiền cho khách |
| `cancelled` | Đỏ | Đã hủy |

### 13.2 Tạo quyết toán cho một khách

1. Nhấn **+ Tạo quyết toán**
2. Chọn **Khách ký gửi**
3. Chọn **Kỳ bắt đầu** và **Kỳ kết thúc**
4. Hệ thống tự tính tất cả sản phẩm đã bán trong kỳ chưa được quyết toán
5. Xem trước: số sản phẩm, tổng doanh thu, hoa hồng REVA, số tiền trả khách
6. Nhấn **Tạo**

**Sau khi tạo:** Hệ thống tự động gửi email thông báo kèm link tra cứu cho khách (nếu có email).

### 13.3 Tạo quyết toán hàng loạt

1. Nhấn **Tạo hàng loạt**
2. Chọn **Kỳ bắt đầu** và **Kỳ kết thúc**
3. Hệ thống tạo quyết toán cho **tất cả** khách có sản phẩm đã bán trong kỳ (chưa được quyết toán)
4. Bỏ qua khách có số tiền = 0
5. Gửi email cho từng khách

> Phù hợp cuối tháng để xử lý tất cả một lần.

### 13.4 Thanh toán quyết toán

1. Mở chi tiết quyết toán `pending`
2. Kiểm tra QR code (nếu khách có thông tin ngân hàng)
3. Thực hiện chuyển khoản thực tế trên app ngân hàng
4. Nhấn **Đánh dấu đã chuyển** trong hệ thống
5. Nhập **Mã tham chiếu** (số giao dịch từ ngân hàng — tùy chọn nhưng nên điền)
6. Trạng thái chuyển sang `paid`, ghi nhận thời gian thanh toán

### 13.5 Xem chi tiết quyết toán

- Tóm tắt: Tổng doanh thu, hoa hồng REVA, số tiền trả khách
- **Bảng chi tiết từng sản phẩm:** Tên SP, mã, giá bán, hoa hồng, tiền khách nhận
- Thông tin thanh toán (nếu đã `paid`): Ngày thanh toán, mã tham chiếu

---

## 14. Cài đặt hệ thống (Settings)

**Yêu cầu quyền:** `settings:manage` (hầu hết tab) hoặc đã đăng nhập (tab Đổi mật khẩu)  
**Đường dẫn:** `/admin/settings`

### 14.1 Tab Thông báo (Announcements)

Quản lý dải thông báo chạy ngang trên website công khai.

- **Thêm mới:** Nhập nội dung → nhấn Thêm
- **Bật/tắt:** Toggle trạng thái active
- **Xóa:** Nhấn icon thùng rác

### 14.2 Tab Chi nhánh (Locations)

Danh sách các cơ sở của REVA.

| Trường | Ghi chú |
|--------|---------|
| Tên chi nhánh | Tên hiển thị |
| Loại | Cửa hàng / Kho / Văn phòng |
| Địa chỉ | Địa chỉ đầy đủ |
| Điện thoại | SĐT chi nhánh |
| Google Maps URL | Đường link bản đồ |

Chi nhánh được dùng trong POS, yêu cầu ký gửi và sản phẩm.

### 14.3 Tab Ngân hàng

Tài khoản ngân hàng để sinh QR code khi bán hàng và quyết toán.

- Tối đa nhiều tài khoản nhưng **chỉ một tài khoản mặc định** được dùng cho POS
- Nhấn **Đặt làm mặc định** để chọn tài khoản POS
- Hệ thống hỗ trợ ~20 ngân hàng Việt Nam phổ biến (VCB, TCB, MB, VPBank, v.v.)

### 14.4 Tab Hoa hồng (Commission)

Cấu hình bảng hoa hồng áp dụng cho tất cả sản phẩm.

Mỗi bậc có: Ngưỡng giá tối đa, Loại (cố định/%), Số tiền/Tỉ lệ.

> Thay đổi hoa hồng chỉ ảnh hưởng **sản phẩm tạo mới** — sản phẩm cũ giữ nguyên hoa hồng đã tính.

### 14.5 Tab Cài đặt biên lai (Receipt)

- **Tự động lưu PDF:** Bật → mỗi khi hoàn thành đơn POS, PDF biên lai tự tải về máy tính

### 14.6 Tab Sản phẩm sắp hết hạn (Expiring)

1. Chọn ngưỡng: **1 / 3 / 7 / 14 ngày** trước hạn
2. Hệ thống liệt kê sản phẩm sắp hết hạn
3. Tích chọn sản phẩm cần gửi nhắc nhở
4. Chọn **template email** (`expiring_soon` mặc định)
5. Nhấn **Gửi nhắc nhở**

> Email gửi đến địa chỉ email của **khách ký gửi** (không phải khách mua).

### 14.7 Tab Email Templates

Tùy chỉnh nội dung email tự động gửi cho khách.

**Templates mặc định có sẵn:**

| Key | Gửi khi nào |
|-----|-------------|
| `expiring_soon` | Gửi thủ công từ tab Expiring |
| `consignment_approved` | Tự động khi duyệt yêu cầu ký gửi |
| `settlement_created` | Tự động khi tạo quyết toán |

**Biến có thể dùng trong template** (dạng `{{tên_biến}}`):

| Template | Biến có sẵn |
|----------|-------------|
| `expiring_soon` | `full_name`, `product_name`, `product_code`, `sale_price`, `consign_end` |
| `consignment_approved` | `full_name`, `request_id`, `created_at`, `request_type`, `scheduled_date`, `admin_notes` |
| `settlement_created` | `full_name`, `settlement_code`, `period_start`, `period_end`, `items_count`, `total_sale`, `total_commission`, `total_payout`, `lookup_url` |

### 14.8 Tab Hệ thống (System) — Chỉ admin

**SMTP (Email):**

| Trường | Ví dụ |
|--------|-------|
| SMTP Host | `smtp.gmail.com` |
| Port | `465` (SSL) hoặc `587` (TLS) |
| Username | `your@gmail.com` |
| Password | App password (không phải mật khẩu Gmail thường) |
| Địa chỉ gửi | `REVA <noreply@reva.vn>` |
| Secure | Bật nếu dùng port 465 |

Nhấn **Test SMTP** để gửi email kiểm tra trước khi lưu.

**CORS (Allowed Origins):** Danh sách domain frontend được phép gọi API. Ví dụ: `https://reva.vn`.

**JWT Secret:** Khóa ký token. **Thay đổi sẽ đăng xuất tất cả người dùng ngay lập tức.**

### 14.9 Tab Đổi mật khẩu

Tất cả người dùng đều có thể đổi mật khẩu của mình:
1. Nhập mật khẩu hiện tại
2. Nhập mật khẩu mới (và xác nhận)
3. Nhấn **Lưu**

---

## 15. Quản lý tài khoản (Users)

**Yêu cầu quyền:** `users:manage` (chỉ admin/superadmin)  
**Đường dẫn:** `/admin/users`

### 15.1 Tạo tài khoản mới

1. Nhấn **+ Thêm tài khoản**
2. Điền thông tin:

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Tên đăng nhập | ✅ | Không thay đổi được sau khi tạo |
| Họ tên | — | Tên hiển thị |
| Email | — | |
| Vai trò | ✅ | Xem bảng quyền ở mục 4 |
| Chi nhánh | — | Gán nhân viên vào chi nhánh cụ thể |
| Mật khẩu | ✅ | Chỉ nhập lúc tạo mới |

3. Nhấn **Lưu**

### 15.2 Sửa tài khoản

- Nhấn icon bút chì để sửa họ tên, email, vai trò, chi nhánh
- Tên đăng nhập **không thể thay đổi**

### 15.3 Đổi mật khẩu (admin cho user khác)

1. Nhấn icon khóa ở hàng người dùng
2. Nhập mật khẩu mới và xác nhận
3. Nhấn **Lưu**

### 15.4 Xóa tài khoản

- Nhấn icon thùng rác
- **Không thể tự xóa tài khoản của mình**
- Xác nhận trong hộp thoại

---

## 16. Quy trình nghiệp vụ đầu cuối

### 16.1 Tiếp nhận khách ký gửi mới

```
1. Khách vào /consign → điền form
2. Admin vào Yêu cầu ký gửi → tìm yêu cầu pending
3. Xem thông tin → Cập nhật sang "approved" + ghi chú lịch hẹn
   → Hệ thống tự gửi email thông báo cho khách
4. Khách mang hàng đến → Cập nhật sang "active"
5. Thỏa thuận giá → Tạo sản phẩm (liên kết với khách ký gửi)
6. Cập nhật yêu cầu sang "completed"
```

### 16.2 Bán hàng và thu tiền

```
1. Nhân viên vào POS
2. Quét mã vạch hoặc tìm sản phẩm
3. Nhập thông tin khách (tùy chọn)
4. Chọn phương thức thanh toán
5. Tạo đơn → In biên lai / Lưu PDF
6. Nếu chưa thu tiền ngay: vào Lịch sử → Xác nhận thanh toán sau
```

### 16.3 Quyết toán cuối tháng

```
1. Vào Quyết toán → Tạo hàng loạt
2. Chọn kỳ (ví dụ: 01/04 → 30/04)
3. Hệ thống tạo quyết toán cho tất cả khách có hàng đã bán
   → Tự gửi email cho từng khách kèm link tra cứu
4. Mở từng quyết toán → Xem QR → Chuyển khoản thực tế
5. Nhấn "Đánh dấu đã thanh toán" + nhập mã giao dịch
6. Khách tra cứu tại /sales để xác nhận
```

### 16.4 Gửi nhắc sản phẩm sắp hết hạn

```
1. Vào Cài đặt → Sản phẩm sắp hết hạn
2. Chọn ngưỡng (ví dụ: 7 ngày)
3. Tích chọn sản phẩm cần nhắc
4. Nhấn "Gửi nhắc nhở"
→ Email tự gửi đến địa chỉ khách ký gửi
```

---

## 17. Câu hỏi thường gặp & Xử lý sự cố

### Q: Sản phẩm không xuất hiện khi tìm kiếm ở POS

**A:** Kiểm tra trạng thái sản phẩm. POS chỉ tìm thấy sản phẩm có trạng thái `active`. Nếu sản phẩm vừa tạo mà không xuất hiện, vào trang Sản phẩm kiểm tra trạng thái hiện tại.

---

### Q: Lỗi "Sản phẩm đã bán hoặc không còn bán" khi tạo đơn

**A:** Sản phẩm vừa được bán từ tab khác hoặc máy tính khác. Làm mới trang POS và kiểm tra lại giỏ hàng.

---

### Q: Không tạo được quyết toán — báo "không có sản phẩm đã bán"

**A:** Kiểm tra:
1. Kỳ ngày có bao gồm ngày bán không
2. Sản phẩm có trạng thái `sold` không (có thể đã được quyết toán kỳ trước)
3. Sản phẩm có được liên kết đúng khách ký gửi không

---

### Q: Email không gửi được

**A:**
1. Vào **Cài đặt → Hệ thống → Test SMTP**
2. Kiểm tra: host, port, username, password SMTP đúng chưa
3. Với Gmail: phải dùng **App Password** (không phải mật khẩu Gmail thường). Bật 2FA trước, rồi vào Google Account → Security → App passwords để tạo.
4. Kiểm tra log server để xem lỗi cụ thể

---

### Q: Quên mật khẩu đăng nhập

**A:** Liên hệ admin để đổi mật khẩu qua trang **Quản lý tài khoản** (admin có thể đổi mật khẩu cho bất kỳ user nào).

---

### Q: QR chuyển khoản không hiển thị khi thanh toán quyết toán

**A:** Vào **Khách hàng ký gửi → Tab Ngân hàng** → Điền đầy đủ ngân hàng, số tài khoản và tên tài khoản cho khách ký gửi đó.

---

### Q: Muốn thay đổi bảng hoa hồng

**A:** Vào **Cài đặt → Hoa hồng** → Chỉnh sửa các bậc. Lưu ý: thay đổi chỉ áp dụng cho sản phẩm **tạo mới sau khi lưu**, không ảnh hưởng sản phẩm đã có.

---

### Q: Cần thêm chi nhánh mới

**A:** Vào **Cài đặt → Chi nhánh** → nhấn **+ Thêm** → điền thông tin → Lưu. Chi nhánh mới xuất hiện ngay trong POS và form ký gửi.

---

### Q: Làm thế nào để khách tra cứu quyết toán?

**A:** Khách vào website → **/sales** → Nhập một trong: mã khách hàng (HUN-XXXXXX), mã quyết toán (QT-XXXXXXXX), hoặc số điện thoại đã đăng ký.

---

*Hướng dẫn này áp dụng cho phiên bản hệ thống REVA tính đến tháng 5/2026.*  
*Mọi thắc mắc liên hệ đội ngũ phát triển hoặc quản trị viên hệ thống.*

# Hướng dẫn tham gia BlogChain (dành cho sinh viên)

BlogChain là DApp thực hành Web3 của **Viện Công nghệ Tài chính – Trường Đại học Đại Nam**. Cả lớp viết bài, chuyển
tiền thử nghiệm và xác thực tài liệu trên **cùng một blockchain**: ai đăng gì, mọi người đều thấy ngay.

👉 **Link DApp:** https://truonguyvu.github.io/Blogchain/dapp/

> **Chỉ xem** bài viết, lịch sử giao dịch, kiểm tra tài liệu: mở link là xem được, **không cần làm gì thêm**.
> Muốn **đăng bài, chuyển tiền, đăng ký tài liệu** thì làm 4 bước dưới đây (khoảng 10 phút).

---

## Bước 1. Cài ví MetaMask

1. Dùng **máy tính** với trình duyệt Chrome, Edge, Brave hoặc Firefox.
2. Vào **metamask.io/download**, cài tiện ích MetaMask, chọn **Create a new wallet** (Tạo ví mới) và đặt mật khẩu.
3. MetaMask đưa ra **12 từ khôi phục** (Secret Recovery Phrase): **chép ra giấy, cất kỹ**.
   - **Không** chụp màn hình, **không** gửi qua Zalo / Messenger / email, **không** đưa cho ai, kể cả giảng viên.
   - Ai có 12 từ này là lấy được toàn bộ ví của bạn.

## Bước 2. Kết nối ví với DApp

1. Mở link DApp, bấm **Kết nối ví MetaMask** (góc trên bên phải), chọn tài khoản rồi bấm **Connect**.
2. Nếu trang hiện nút **Chuyển sang Sepolia Testnet**, bấm nút đó rồi bấm **Approve / Switch network** trong MetaMask.
3. Kết nối xong, dải thông tin hiện **Mạng: Sepolia Testnet**, địa chỉ ví và số dư.

## Bước 3. Lấy ETH thử nghiệm (để trả phí giao dịch)

Mỗi giao dịch cần một khoản phí rất nhỏ bằng **Sepolia ETH**. Đây là tiền **thử nghiệm, không có giá trị thật**,
không mua bán được.

- **Cách 1 (nhanh nhất): xin giảng viên.** Mở MetaMask, bấm vào tên tài khoản ở trên cùng để **sao chép địa chỉ ví**
  (dạng `0x...`, 42 ký tự) rồi gửi vào nhóm lớp. Giảng viên chuyển cho bạn qua thẻ **Chuyển tiền** của DApp.
  Địa chỉ ví là thông tin công khai, gửi thoải mái; **12 từ khôi phục thì tuyệt đối không**.
- **Cách 2: tự "đào" ở Sepolia PoW Faucet** (sepolia-faucet.pk910.de): dán địa chỉ ví, bấm Start Mining, để trình duyệt
  chạy vài chục phút rồi bấm Claim. Không cần tài khoản.

Khoảng **0,001 ETH** đủ để đăng chừng 15 bài hoặc chuyển tiền / đăng ký tài liệu hàng chục lần.

## Bước 4. Đăng bài đầu tiên

1. Chọn thẻ **Blog**, nhập **Tiêu đề** và **Nội dung**, bấm **Đăng bài**.
2. MetaMask hiện bảng xác nhận, kiểm tra phí rồi bấm **Confirm**.
3. Chờ **15–30 giây** để giao dịch được ghi vào một block. Bài của bạn xuất hiện trong danh sách, kèm nút **Sửa / Xóa**
   (chỉ tác giả mới thấy).
4. Bấm **Chi tiết** để xem bài được ghi ở block nào, mã giao dịch là gì, và các phiên bản trước khi sửa.

## Thử thêm các chức năng khác

| Thẻ | Thử làm |
|---|---|
| **Chuyển tiền** | Chuyển 0,0001 ETH cho bạn cùng lớp kèm ghi chú, xem giao dịch hiện trong bảng lịch sử của cả hai |
| **Xác thực** | Đăng ký một file (ví dụ bài tập PDF), sửa một chữ trong file rồi kiểm tra lại: DApp báo file **không khớp** |
| **Tra cứu** | Dán mã giao dịch (TX hash) để xem người gửi, người nhận, số tiền, phí gas |
| **Nhật ký** | Xem từng bước DApp làm: kết nối ví, gửi giao dịch, nhận sự kiện mới từ blockchain |

## Quy tắc nội dung

- Mọi thứ ghi lên blockchain là **công khai** và **không thể xóa vĩnh viễn**. Nút **Xóa** chỉ ẩn bài trên giao diện;
  dữ liệu cũ vẫn nằm trong lịch sử blockchain.
- **Không** đăng số điện thoại, CCCD, địa chỉ nhà, mật khẩu hay thông tin cá nhân của mình và người khác.
- Viết lịch sự, đúng chủ đề môn học. Bài không phù hợp sẽ bị **giảng viên / quản trị viên ẩn** kèm lý do công khai
  (xem mục **Kiểm duyệt nội dung** ở cuối thẻ Blog).

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| Bấm nút mà MetaMask không hiện | Bấm biểu tượng MetaMask (hình con cáo) trên thanh công cụ trình duyệt; bảng xác nhận có thể đang chờ ở đó |
| Trang báo **Sai mạng** | Bấm **Chuyển sang Sepolia Testnet** trên trang |
| Báo **không đủ ETH** (insufficient funds) | Ví chưa có Sepolia ETH: làm lại Bước 3 |
| Đăng xong chưa thấy bài | Chờ thêm 15–30 giây hoặc bấm **Tải lại** ở danh sách bài viết |
| Muốn dùng trên điện thoại | Nên dùng máy tính. Trên điện thoại, mở link DApp bằng trình duyệt bên trong ứng dụng MetaMask |

---

## Dành cho giảng viên

- **Chia ETH cho lớp:** thu địa chỉ ví của sinh viên, chuyển mỗi bạn khoảng 0,001 ETH ở thẻ **Chuyển tiền**
  (mỗi lần chuyển tốn phí rất nhỏ).
- **Kiểm duyệt bài viết:** kết nối bằng **ví chủ sở hữu** (ví đã dùng để deploy contract). Mỗi bài có nút **🚫 Ẩn bài**:
  nhập lý do, xác nhận trong MetaMask. Người xem chỉ thấy "Bài viết đã bị quản trị viên ẩn" kèm lý do; bấm
  **👁️ Hiện lại** để bỏ ẩn (đánh dấu ô "Hiện cả bài đã xóa hoặc bị ẩn" để thấy các bài đang ẩn).
- **Thêm trợ giảng làm quản trị viên:** mở **Kiểm duyệt nội dung** ở cuối thẻ Blog, dán địa chỉ ví của trợ giảng, bấm
  **Thêm quản trị viên**. Trợ giảng ẩn / hiện bài được nhưng không thêm được quản trị viên khác.
- Sinh viên muốn **cùng phát triển mã nguồn** hoặc **tự dựng bản BlogChain riêng** làm đồ án: xem [CONTRIBUTING.md](CONTRIBUTING.md).

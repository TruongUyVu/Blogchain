# BlogChain

Blog cơ bản trên blockchain để học Solidity và smart contract. Chạy hoàn toàn cục bộ bằng Ganache, Truffle và MetaMask.

## Cấu trúc

- `blogchain-truffle/`: hợp đồng `BlogChain.sol` (đăng, sửa, xóa mềm bài viết), migrations và 9 test tự động.
- `dapp/`: giao diện web (HTML, CSS, JavaScript, ethers.js v6) để tương tác với hợp đồng qua MetaMask.
- `chay-dapp.bat`: bật máy chủ web cho thư mục `dapp` (Windows, cổng 3000).

## Yêu cầu

Node.js 20, Truffle 5.x (`npm i -g truffle`), Ganache 2.7.1, tiện ích MetaMask.

## Cách chạy

1. Mở Ganache (RPC `http://127.0.0.1:7545`).
2. Trong `blogchain-truffle`: `truffle compile`, `truffle migrate --reset`, `truffle test`.
3. Chạy `chay-dapp.bat` rồi mở `http://localhost:3000`.
4. Trong MetaMask, chọn mạng Ganache (Chain ID 1337) và nhập một tài khoản Ganache.
5. Trên dapp: Kết nối MetaMask, dán địa chỉ `BlogChain` (lấy từ `truffle migrate`), bấm Tải & Kết nối Contract.

Địa chỉ hợp đồng thay đổi sau mỗi lần triển khai lại, nên không được lưu cố định trong mã.

## Thiết lập một lần (làm đúng thứ tự)

1. **Mở Ganache** và kiểm tra RPC là `http://127.0.0.1:7545`.
2. **Triển khai hợp đồng.** Mở PowerShell thường (không phải trong `truffle console`) tại `blogchain-truffle` và chạy `truffle migrate --reset`. Ghi lại dòng `contract address` của `BlogChain` (không lấy địa chỉ của `Migrations`).
3. **Bật dapp.** Bấm đúp `chay-dapp.bat`, giữ nguyên cửa sổ đen, mở `http://localhost:3000` rồi nhấn Ctrl+F5.
4. **Chuẩn bị MetaMask.**
   - Bấm nút **Chuyển sang Ganache** trên dapp (Chain ID 1337, RPC `http://127.0.0.1:7545`) và đồng ý trong MetaMask.
   - Trong Ganache, tab ACCOUNTS, bấm biểu tượng chìa khóa ở tài khoản số 0 để lấy khóa riêng. Trong MetaMask chọn **Import account** và dán khóa vào. Chỉ dùng khóa của ví thử Ganache, không dùng khóa ví thật.
   - Bấm trạng thái kết nối của MetaMask và chọn **Connect** tài khoản này cho `localhost:3000`.
   - Kiểm tra: số dư hiển thị khoảng 100 ETH.
5. **Dùng dapp.** Bấm **Kết nối MetaMask**, dán địa chỉ `BlogChain` vào ô Contract Address, bấm **Tải & Kết nối Contract**, rồi thử đăng bài.

## Khi Ganache bị đặt lại hoặc tạo workspace mới

Hợp đồng cũ không còn. Chạy lại `truffle migrate --reset`, dán địa chỉ mới vào dapp. Trong MetaMask vào **Settings, Advanced, Clear activity tab data** để tránh lỗi nonce.

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `localhost refused to connect` | Cửa sổ `chay-dapp.bat` đã đóng hoặc đang chạy ở thư mục sai | Bấm đúp lại `chay-dapp.bat` và giữ cửa sổ mở |
| Trang hiện `Chain ID: 1` hoặc số dư 0 | MetaMask sai mạng hoặc sai tài khoản | Bấm **Chuyển sang Ganache**, chọn đúng tài khoản Ganache đã nhập và cho phép kết nối |
| `Không có contract nào ở địa chỉ này` | Dán nhầm địa chỉ hoặc Ganache đã bị đặt lại | Lấy địa chỉ `BlogChain` mới nhất sau `truffle migrate --reset` |
| `could not coalesce error` | Thường là lệch nonce, thiếu ETH hoặc không phải tác giả | Đọc phần **Chi tiết** và **Gợi ý** trong nhật ký cuối trang dapp |
| `... is not defined` khi gõ lệnh | Đang ở trong `truffle console`, gõ thừa chữ `truffle` hoặc sai chính tả | Trong console chỉ gõ `compile`, `migrate --reset`, `test`; gõ `.exit` để thoát |

## Lưu ý an toàn

Không đưa khóa riêng, cụm từ khôi phục (mnemonic) hay file `.env` lên repo. Dự án chỉ dùng cho mạng thử cục bộ.

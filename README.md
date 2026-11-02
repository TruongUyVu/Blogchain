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

## Lưu ý an toàn

Không đưa khóa riêng, cụm từ khôi phục (mnemonic) hay file `.env` lên repo. Dự án chỉ dùng cho mạng thử cục bộ.

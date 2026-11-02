# BlogChain – Truffle + Ganache + MetaMask

Project blog cơ bản trên blockchain để thực hành. Chạy hoàn toàn trên máy (Ganache).

## Cấu trúc

```
blogchain-truffle/
├── contracts/
│   ├── Migrations.sol        # contract chuẩn của Truffle
│   └── BlogChain.sol         # contract blog: đăng, sửa, xóa mềm, đọc bài
├── migrations/
│   ├── 1_initial_migration.js
│   └── 2_deploy_blogchain.js # deploy BlogChain
├── test/
│   └── blogchain.test.js     # 9 test tự động
└── truffle-config.js         # kết nối Ganache 127.0.0.1:7545, solc 0.8.19
```

## Các bước chạy

1. Mở Ganache, tạo workspace (Quickstart). Kiểm tra mục RPC SERVER: nếu không phải
   `HTTP://127.0.0.1:7545` thì sửa `port` trong `truffle-config.js`.
2. Mở terminal tại thư mục project này:

```
cd D:\Blogchain\blogchain-truffle
truffle version
truffle compile
truffle migrate --reset
truffle test
```

3. Thử tương tác trực tiếp:

```
truffle console
truffle(development)> let blog = await BlogChain.deployed()
truffle(development)> await blog.createPost("Bai dau tien", "Xin chao blockchain")
truffle(development)> (await blog.getPostCount()).toString()
truffle(development)> await blog.getPost(0)
```

4. Nối với giao diện web (thư mục `dapp`):
   - Địa chỉ contract: lấy ở dòng `contract address` của `BlogChain` khi `truffle migrate`
     (hoặc tab CONTRACTS của Ganache).
   - ABI: mở `build/contracts/BlogChain.json`, copy mảng `abi` để thay `CONTRACT_ABI` trong `dapp/app.js`.
   - Giao diện hiện tại vẫn là bản SimpleStorage, cần sửa để có form đăng bài và danh sách bài viết.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Could not connect to your Ethereum client` | Chưa mở Ganache hoặc sai cổng trong `truffle-config.js` |
| `invalid opcode` khi deploy | Đảm bảo `solc 0.8.19` và `evmVersion: "paris"` như trong config |
| MetaMask báo `nonce too high` | MetaMask → Settings → Advanced → Clear activity tab data |
| Sau khi mở lại workspace, dapp không đọc được | Deploy lại (`truffle migrate --reset`) và dán địa chỉ contract mới |
| Lỗi lạ khi chạy `truffle` trên Node 20 | Nâng Truffle: `npm i -g truffle@5.11.5` |

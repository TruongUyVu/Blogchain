# BlogChain – Truffle + Ganache + MetaMask

Project blog cơ bản trên blockchain để thực hành. Chạy hoàn toàn trên máy (Ganache).

## Cấu trúc

```
blogchain-truffle/
├── contracts/
│   ├── Migrations.sol        # contract chuẩn của Truffle
│   ├── BlogChain.sol         # contract blog: đăng, sửa, xóa mềm, đọc bài
│   ├── Payments.sol          # chuyển ETH giữa các ví kèm ghi chú, phát sự kiện Transferred
│   └── DocumentRegistry.sol  # xác thực tài liệu: đăng ký / thu hồi mã băm SHA-256 của file
├── migrations/
│   ├── 1_initial_migration.js
│   ├── 2_deploy_blogchain.js # deploy BlogChain
│   ├── 3_deploy_payments.js  # deploy Payments
│   └── 4_deploy_document_registry.js # deploy DocumentRegistry
├── test/
│   ├── blogchain.test.js     # 9 test tự động
│   ├── payments.test.js      # 6 test tự động
│   └── documentRegistry.test.js # 8 test tự động
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

## Đưa lên Internet (Sepolia + GitHub Pages)

DApp mặc định dùng testnet **Sepolia** (`const NET = NETWORKS.sepolia` trong `dapp/app.js`).
Chạy thử trên máy với Ganache thì đổi thành `NETWORKS.ganache`.

1. Trong MetaMask, tạo một tài khoản riêng để deploy, xin Sepolia ETH miễn phí ở một "Sepolia faucet".
2. Lấy RPC URL Sepolia ở Infura hoặc Alchemy.
3. Copy `.env.example` thành `.env`, điền `SEPOLIA_RPC_URL` và `PRIVATE_KEY` (file `.env` không bao giờ được đưa lên Git).
4. Deploy:

```
cd D:\Blogchain\blogchain-truffle
npm install
truffle migrate --network sepolia
```

5. Dán địa chỉ contract và số block lúc deploy vào `NETWORKS.sepolia` trong `dapp/app.js`:
   `BlogChain` → `contractAddress`, `deployBlock`; `Payments` → `paymentsAddress`, `paymentsDeployBlock`;
   `DocumentRegistry` → `docsAddress`, `docsDeployBlock`.
   Chỉ deploy thêm một contract mới mà không đụng các contract cũ: `truffle migrate -f 4 --to 4 --network sepolia`
   (số 4 là số thứ tự file migration).

Contract đang dùng trên Sepolia:

| Contract | Địa chỉ |
|---|---|
| BlogChain | `0x1b59c8aAAa7a258eafe7c708Fc27b6d4e2a7e7F0` |
| Payments | `0xaDBF8d7370383A83Eef6d3844b30f285Fc9f7e1c` |
| DocumentRegistry | `0xb6a99853dC40129d69D3A0e27438Fd4305A9654A` |

Lưu ý gas: Sepolia tính gas cao hơn Ganache nhiều (deploy DocumentRegistry: ~5,4 triệu gas trên Sepolia so với ~0,8 triệu trên Ganache).
Nếu deploy báo "ran out of gas" dù contract đơn giản, thường là do số dư ví < gas tối đa × `maxFeePerGas` trong `truffle-config.js`.
6. Commit, push, rồi bật GitHub Pages (Settings → Pages → nhánh `main`). Link DApp:
   `https://truonguyvu.github.io/Blogchain/dapp/`

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Could not connect to your Ethereum client` | Chưa mở Ganache hoặc sai cổng trong `truffle-config.js` |
| `invalid opcode` khi deploy | Đảm bảo `solc 0.8.19` và `evmVersion: "paris"` như trong config |
| MetaMask báo `nonce too high` | MetaMask → Settings → Advanced → Clear activity tab data |
| Sau khi mở lại workspace, dapp không đọc được | Deploy lại (`truffle migrate --reset`) và dán địa chỉ contract mới |
| Lỗi lạ khi chạy `truffle` trên Node 20 | Nâng Truffle: `npm i -g truffle@5.11.5` |

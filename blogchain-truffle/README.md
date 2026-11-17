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
4. Deploy (tự xuất ABI + địa chỉ ra `dapp/contracts.json` sau khi deploy xong):

```
cd D:\Blogchain\blogchain-truffle
npm install
npm run deploy:sepolia
```

5. Giao diện tự đọc địa chỉ, số block lúc deploy và ABI từ `dapp/contracts.json`, **không cần chép tay vào `app.js`**.
   - Deploy bằng lệnh `truffle migrate ...` trực tiếp thì chạy thêm `npm run export` để cập nhật `contracts.json`.
   - Chỉ deploy thêm một contract mới mà không đụng các contract cũ:
     `truffle migrate -f 4 --to 4 --network sepolia` rồi `npm run export` (số 4 là số thứ tự file migration).
   - Sau khi cập nhật `contracts.json`, tăng số `?v=` của `CONTRACTS_JSON_URL` trong `dapp/app.js`
     để trình duyệt không dùng bản lưu tạm cũ.

Contract đang dùng trên Sepolia:

| Contract | Địa chỉ |
|---|---|
| BlogChain | `0x1b59c8aAAa7a258eafe7c708Fc27b6d4e2a7e7F0` |
| Payments | `0xaDBF8d7370383A83Eef6d3844b30f285Fc9f7e1c` |
| DocumentRegistry | `0xb6a99853dC40129d69D3A0e27438Fd4305A9654A` |

Lưu ý gas: Sepolia tính gas cao hơn Ganache nhiều, nhất là khi deploy (~1.600 gas cho mỗi byte mã contract).
`truffle-config.js` đã bật optimizer (runs = 200), giảm phí deploy khoảng 40-55%:

| Contract | Optimizer tắt (Sepolia) | Optimizer bật (Sepolia) |
|---|---|---|
| BlogChain | ~9,9 triệu gas | ~6,1 triệu gas |
| Payments | ~3,6 triệu gas | ~1,8 triệu gas |
| DocumentRegistry | ~5,5 triệu gas | ~2,5 triệu gas |

Ba contract đang dùng ở bảng trên được deploy khi optimizer còn TẮT; nếu xác minh mã nguồn trên Etherscan thì chọn "Optimization: No".
Nếu deploy báo "ran out of gas" dù contract đơn giản, thường là do số dư ví < gas tối đa × `maxFeePerGas` trong `truffle-config.js`.
6. Commit, push, rồi bật GitHub Pages (Settings → Pages → nhánh `main`). Link DApp:
   `https://truonguyvu.github.io/Blogchain/dapp/`

## Xác minh mã nguồn contract (verify)

Xác minh để ai cũng đọc được mã Solidity của contract và kiểm chứng nó khớp với mã đang chạy trên chuỗi.
Script `scripts/verify-contracts.js` so mã biên dịch với mã trên chuỗi trước, khớp 100% mới gửi đi.

```
npm run verify          # contract deploy khi optimizer BẬT (từ nay về sau)
npm run verify:legacy   # 3 contract đầu (BlogChain, Payments, DocumentRegistry) deploy khi optimizer TẮT
```

- **Sourcify**: không cần khóa. Cả 3 contract đã xác minh mức `exact_match`, xem tại
  `https://repo.sourcify.dev/11155111/<địa chỉ contract>` (chân trang DApp có link sẵn).
- **Etherscan**: cần khóa API miễn phí (etherscan.io → API Keys). Thêm dòng `ETHERSCAN_API_KEY=...` vào `.env`
  rồi chạy lại lệnh trên. Etherscan không tự lấy kết quả từ Sourcify nên phải xác minh riêng.

## Nguồn dữ liệu (RPC) dự phòng

Giao diện đọc dữ liệu qua RPC công khai, khai báo trong `NETWORKS.sepolia.readRpcs` (`dapp/app.js`), thử lần lượt:

| Nguồn | Đọc lịch sử tối đa | Gộp lệnh (batch) |
|---|---|---|
| ethereum-sepolia-rpc.publicnode.com | 45.000 block | có |
| sepolia.gateway.tenderly.co | 45.000 block | không (treo khi gộp eth_getLogs + eth_call) |
| 0xrpc.io/sep | 9.000 block | không |

Nguồn đang dùng lỗi 3 lần liên tiếp (~45 giây) thì trang tự chuyển nguồn. Thêm nguồn mới: kiểm tra trên trình duyệt
(CORS), giới hạn `eth_getLogs` và khả năng gộp lệnh trước khi đưa vào danh sách.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Could not connect to your Ethereum client` | Chưa mở Ganache hoặc sai cổng trong `truffle-config.js` |
| `invalid opcode` khi deploy | Đảm bảo `solc 0.8.19` và `evmVersion: "paris"` như trong config |
| MetaMask báo `nonce too high` | MetaMask → Settings → Advanced → Clear activity tab data |
| Sau khi mở lại workspace, dapp không đọc được | Deploy lại (`truffle migrate --reset`) và dán địa chỉ contract mới |
| Lỗi lạ khi chạy `truffle` trên Node 20 | Nâng Truffle: `npm i -g truffle@5.11.5` |

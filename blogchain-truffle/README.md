# BlogChain – hướng dẫn cho người phát triển

Smart contract (Truffle + Solidity 0.8.19) và quy trình phát triển của DApp BlogChain:
thử trên máy với **Ganache**, deploy lên mạng thử nghiệm **Sepolia**, giao diện ở thư mục `../dapp` trên GitHub Pages.
Giới thiệu chung và hướng dẫn cho người dùng: [README ở thư mục gốc](../README.md).

## Cấu trúc

```
blogchain-truffle/
├── contracts/
│   ├── Migrations.sol                 # contract chuẩn của Truffle
│   ├── BlogChain.sol                  # blog: đăng, sửa, xóa mềm, đọc bài (chỉ tác giả sửa / xóa)
│   ├── Payments.sol                   # chuyển ETH giữa các ví kèm ghi chú, phát sự kiện Transferred
│   └── DocumentRegistry.sol           # xác thực tài liệu: đăng ký / thu hồi mã băm SHA-256 của file
├── migrations/
│   ├── 1_initial_migration.js
│   ├── 2_deploy_blogchain.js
│   ├── 3_deploy_payments.js
│   └── 4_deploy_document_registry.js
├── test/
│   ├── blogchain.test.js              # 9 test
│   ├── payments.test.js               # 6 test
│   └── documentRegistry.test.js       # 8 test
├── scripts/
│   ├── export-contracts.js            # ghi ABI + địa chỉ + block deploy ra ../dapp/contracts.json
│   └── verify-contracts.js            # xác minh mã nguồn trên Sourcify / Etherscan
├── truffle-config.js                  # mạng development (Ganache) và sepolia, solc 0.8.19, optimizer
├── package.json                       # các lệnh npm run ... (bảng bên dưới)
└── .env.example                       # mẫu file .env (khóa bí mật, KHÔNG đưa lên Git)
```

## Cài đặt (một lần)

Yêu cầu: Node.js 20, Truffle 5.x (`npm i -g truffle`; lỗi lạ trên Node 20 thì `npm i -g truffle@5.11.5`), Ganache.

```
cd D:\Blogchain\blogchain-truffle
npm install
copy .env.example .env
notepad .env
```

Điền vào `.env` (chỉ cần khi deploy / xác minh trên Sepolia):

| Biến | Ý nghĩa |
|---|---|
| `SEPOLIA_RPC_URL` | Link RPC Sepolia, ví dụ `https://ethereum-sepolia-rpc.publicnode.com` (không cần đăng ký) hoặc link riêng của Infura / Alchemy |
| `PRIVATE_KEY` | Private key của **một tài khoản riêng để deploy** (không phải seed phrase); chỉ chứa ETH thử nghiệm |
| `ETHERSCAN_API_KEY` | Không bắt buộc; khóa API miễn phí của etherscan.io để xác minh mã nguồn trên Etherscan |

## Các lệnh

| Lệnh | Việc làm |
|---|---|
| `npm test` | Chạy 23 test trên Ganache (`truffle test`, cần mở Ganache) |
| `npm run deploy:ganache` | Deploy lại toàn bộ lên Ganache rồi cập nhật `../dapp/contracts.json` |
| `npm run deploy:sepolia` | Deploy các migration chưa chạy lên Sepolia rồi cập nhật `../dapp/contracts.json` |
| `npm run export` | Chỉ cập nhật `../dapp/contracts.json` từ `build/contracts` (sau khi deploy bằng `truffle migrate` trực tiếp) |
| `npm run verify` | Xác minh mã nguồn các contract deploy khi optimizer **bật** |
| `npm run verify:legacy` | Xác minh 3 contract đầu tiên (deploy khi optimizer còn **tắt**) |

## Chạy thử trên máy với Ganache

1. Mở Ganache, tạo workspace (Quickstart). RPC SERVER phải là `HTTP://127.0.0.1:7545`
   (khác thì sửa `port` trong `truffle-config.js`).
2. Deploy và chạy test:

```
npm run deploy:ganache
npm test
```

3. Cho giao diện dùng Ganache: trong `../dapp/app.js` đổi `const NET = NETWORKS.sepolia;` thành
   `const NET = NETWORKS.ganache;`. **Đổi lại trước khi commit**, vì trang công khai phải dùng Sepolia.
4. Bấm đúp `../chay-dapp.bat` (giữ cửa sổ mở), vào `http://localhost:3000`, nhấn Ctrl+F5.
5. MetaMask: thêm mạng Ganache (Chain ID 1337, RPC `http://127.0.0.1:7545`; nút **Chuyển sang Ganache Local**
   trên trang làm việc này), rồi **Import account** bằng private key của một tài khoản Ganache (tab ACCOUNTS, biểu tượng chìa khóa).
6. Thử tương tác trực tiếp trong `truffle console`:

```
truffle console
truffle(development)> let blog = await BlogChain.deployed()
truffle(development)> await blog.createPost("Bai dau tien", "Xin chao blockchain")
truffle(development)> (await blog.getPostCount()).toString()
```

Ganache bị đặt lại / tạo workspace mới: contract cũ mất, chạy lại `npm run deploy:ganache`; trong MetaMask vào
Settings → Advanced → Clear activity tab data để tránh lỗi nonce.

## Deploy lên Sepolia và cập nhật trang công khai

1. Ví deploy (`PRIVATE_KEY`) phải có Sepolia ETH (faucet: xem README gốc).
2. Thử kỹ trên Ganache trước (`npm test`), rồi deploy:

```
npm run deploy:sepolia
```

   Chỉ deploy **một** contract mới mà không đụng contract cũ (ví dụ migration số 5):
   `truffle migrate -f 5 --to 5 --network sepolia` rồi `npm run export`.
3. Giao diện tự đọc địa chỉ, block deploy và ABI từ `../dapp/contracts.json`, **không chép tay vào `app.js`**.
4. Xác minh mã nguồn contract mới: `npm run verify`.
5. **Tăng số phiên bản** để trình duyệt không dùng bản lưu tạm cũ (GitHub Pages cho lưu 10 phút):
   - sửa `contracts.json` → tăng `?v=` trong `CONTRACTS_JSON_URL` (`../dapp/app.js`);
   - sửa `app.js` / `style.css` → tăng `?v=` tương ứng trong `../dapp/index.html`.
6. Commit, push lên nhánh `main`; khoảng 1 phút sau trang https://truonguyvu.github.io/Blogchain/dapp/ có bản mới
   (GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root).

Contract đang dùng trên Sepolia:

| Contract | Địa chỉ | Optimizer khi deploy |
|---|---|---|
| BlogChain | `0x1b59c8aAAa7a258eafe7c708Fc27b6d4e2a7e7F0` | tắt |
| Payments | `0xaDBF8d7370383A83Eef6d3844b30f285Fc9f7e1c` | tắt |
| DocumentRegistry | `0xb6a99853dC40129d69D3A0e27438Fd4305A9654A` | tắt |

## Gas và phí

- Sepolia tính gas cao hơn Ganache nhiều: deploy tốn ~1.600 gas cho mỗi byte mã contract; một bài viết ngắn
  ~1,1–1,25 triệu gas. **Ước tính phí phải đo trên Sepolia** (`eth_estimateGas`), không dùng số đo trên Ganache.
- `truffle-config.js` đã **bật optimizer** (runs = 200), giảm phí deploy ~40–55%:

| Contract | Optimizer tắt | Optimizer bật |
|---|---|---|
| BlogChain | ~9,9 triệu gas | ~6,1 triệu gas |
| Payments | ~3,6 triệu gas | ~1,8 triệu gas |
| DocumentRegistry | ~5,5 triệu gas | ~2,5 triệu gas |

- Deploy dùng tip `maxPriorityFeePerGas` = 0,05 gwei (Truffle mặc định 2,5 gwei, đắt gấp ~50 lần) và trần
  `maxFeePerGas` = 0,5 gwei. Đừng đặt trần quá cao: mạng yêu cầu số dư ≥ gas tối đa × trần, thiếu thì Truffle báo nhầm
  **"ran out of gas"** dù contract không có lỗi.
- Giao diện cũng gợi ý tip 0,05 gwei cho mọi giao dịch và đặt giới hạn gas = ước tính + 30% (giao dịch xóa bớt dữ liệu,
  ví dụ sửa bài cho ngắn lại, từng bị "out of gas" khi dùng đúng số ước tính). Gas dư không bị tính phí.

## Xác minh mã nguồn contract (verify)

Để ai cũng đọc được mã Solidity và kiểm chứng nó khớp với mã đang chạy trên chuỗi. `scripts/verify-contracts.js`
biên dịch, so mã với mã trên chuỗi, **khớp 100% mới gửi đi**.

- **Sourcify** (không cần khóa): cả 3 contract đã xác minh mức `exact_match`, xem tại
  `https://repo.sourcify.dev/11155111/<địa chỉ contract>` (chân trang DApp có link sẵn).
- **Etherscan**: cần `ETHERSCAN_API_KEY` trong `.env` (etherscan.io → API Keys). Etherscan **không** tự lấy kết quả
  từ Sourcify nên phải xác minh riêng: thêm khóa rồi chạy lại `npm run verify:legacy` / `npm run verify`.
- 3 contract đầu được deploy khi optimizer còn tắt: `verify:legacy` biên dịch lại với `SOLC_OPTIMIZER=off`
  vào `build/verify-legacy` để khớp đúng như lúc deploy.

## Giao diện (`../dapp`) – những điều cần biết

- **Đọc dữ liệu không cần ví**: qua RPC công khai khai báo trong `NETWORKS.sepolia.readRpcs`, thử lần lượt và tự chuyển
  nguồn khi nguồn đang dùng lỗi 3 lần liên tiếp (~45 giây):

| Nguồn | Đọc lịch sử tối đa | Gộp lệnh (batch) |
|---|---|---|
| ethereum-sepolia-rpc.publicnode.com | 45.000 block | có |
| sepolia.gateway.tenderly.co | 45.000 block | không (treo khi gộp `eth_getLogs` + `eth_call`) |
| 0xrpc.io/sep | 9.000 block | không |

  Thêm nguồn mới: kiểm tra trên trình duyệt (CORS), giới hạn `eth_getLogs` và khả năng gộp lệnh trước.
- **Ghi dữ liệu qua MetaMask**; trước mỗi giao dịch trang kiểm tra ví đang ở đúng Sepolia, sai mạng thì không gửi.
- Lịch sử sự kiện được đọc theo từng đoạn block (RPC công khai giới hạn số block mỗi lần) và cập nhật mỗi 15 giây.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Could not connect to your Ethereum client` | Chưa mở Ganache hoặc sai cổng trong `truffle-config.js` |
| `invalid opcode` khi deploy lên Ganache | Giữ `solc 0.8.19` và `evmVersion: "paris"` như trong config |
| Deploy Sepolia báo `ran out of gas` | Thường do số dư < gas tối đa × `maxFeePerGas`; nạp thêm Sepolia ETH hoặc giảm trần phí |
| MetaMask báo `nonce too high` | MetaMask → Settings → Advanced → Clear activity tab data (hay gặp sau khi Ganache bị đặt lại) |
| Trang báo "Sai mạng" | Bấm **Chuyển sang Sepolia Testnet** trên trang hoặc chọn mạng Sepolia trong MetaMask |
| Trang vẫn hiện bản cũ sau khi push | Chưa tăng `?v=`; tạm thời nhấn Ctrl+F5 |
| `localhost refused to connect` khi thử trên máy | Cửa sổ `chay-dapp.bat` đã đóng; bấm đúp lại và giữ cửa sổ mở |
| `... is not defined` khi gõ lệnh | Đang ở trong `truffle console`: chỉ gõ `compile`, `migrate --reset`, `test`; gõ `.exit` để thoát |

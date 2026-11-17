# Thiết kế chức năng Cho vay ngang hàng (P2P Lending)

> **Trạng thái:** bản thiết kế, **chưa triển khai**. Nền móng trong mã nguồn đã sẵn sàng (xem mục 7).
> Chỉ dùng để **học tập trên mạng thử nghiệm Sepolia**, không dùng tiền thật. Cho vay P2P bằng tiền thật ở Việt Nam
> thuộc diện quản lý của Ngân hàng Nhà nước.

## 1. Mục tiêu

Sinh viên tự tạo khoản vay, cho vay, trả nợ trên blockchain và hiểu được:
- **ký quỹ (escrow)**: smart contract giữ tiền thay hai bên, không cần bên trung gian;
- vì sao vay trên blockchain phải **thế chấp vượt mức** (chỉ biết địa chỉ ví, không biết danh tính);
- **vòng đời** khoản vay và xử lý **quá hạn**;
- dùng **dấu vân tay tài liệu** (SHA-256, như thẻ Xác thực) để hai bên không sửa lén hợp đồng vay.

## 2. Thông số (đề xuất, giảng viên chốt trước khi làm)

| Thông số | Đề xuất | Lý do |
|---|---|---|
| Tài sản thế chấp tối thiểu | **150%** số tiền vay | Mức phổ biến trong DeFi, dễ giải thích |
| Số tiền vay tối đa | **0,005 ETH** / khoản | Tránh vài người vay hết ETH thử nghiệm của cả lớp |
| Thời hạn | **10 phút – 30 ngày** | 10 phút để minh họa quá hạn ngay trong buổi học |
| Lãi | **Cố định**, người vay đề xuất, tối đa **20%** tiền gốc | Dễ hiểu; lãi theo thời gian để giai đoạn sau |
| Mục đích vay | Chữ, tối đa 200 byte, **chỉ ghi trong sự kiện** | Rẻ gas (như tên tài liệu ở DocumentRegistry) |

Các thông số là **hằng số trong contract** (`constant`): đổi thông số = deploy contract mới.

## 3. Vòng đời một khoản vay

```
                 requestLoan (gửi kèm thế chấp)
                          │
                          ▼
   cancelRequest ◄── [Requested] ── fundLoan (người cho vay gửi đúng tiền gốc;
        │                 │          contract chuyển ngay tiền gốc cho người vay)
        ▼                 ▼
   [Cancelled]        [Funded] ──────── repay (trước hoặc sau hạn, khi chưa bị thu thế chấp):
   (trả lại thế chấp)     │              gốc + lãi → người cho vay, thế chấp → người vay
                          │                         ▼
                          │                     [Repaid]
                          │
                          └── quá hạn (block.timestamp > fundedAt + duration)
                              claimCollateral (chỉ người cho vay): thế chấp → người cho vay
                                                    ▼
                                               [Defaulted]
```

## 4. Contract `P2PLending` (Solidity 0.8.19, optimizer bật)

### Dữ liệu
```solidity
enum Status { Requested, Funded, Repaid, Cancelled, Defaulted }

struct Loan {
    address borrower;
    address lender;      // 0 khi chưa có người cho vay
    uint128 principal;   // tiền gốc (wei)
    uint128 interest;    // tiền lãi cố định (wei)
    uint128 collateral;  // thế chấp người vay đã gửi (wei)
    uint64  duration;    // thời hạn (giây), tính từ lúc được cấp vốn
    uint64  fundedAt;    // timestamp lúc được cấp vốn (0 khi chưa)
    Status  status;
    bytes32 docHash;     // SHA-256 của file hợp đồng vay (0 nếu không có), file không lên chuỗi
}
Loan[] private loans;    // id = vị trí trong mảng, giống BlogChain
```

### Hàm
| Hàm | Ai gọi | Kiểm tra chính | Tác dụng |
|---|---|---|---|
| `requestLoan(principal, interest, duration, docHash, purpose)` **payable** | Người vay | `msg.value` (thế chấp) ≥ 150% gốc; gốc ≤ tối đa; lãi ≤ 20%; thời hạn trong khoảng | Tạo khoản vay `Requested` |
| `cancelRequest(id)` | Người vay | Đang `Requested` | `Cancelled`, trả lại thế chấp |
| `fundLoan(id)` **payable** | Người cho vay | Đang `Requested`; `msg.value == principal`; không tự cho mình vay | `Funded`, chuyển gốc cho người vay |
| `repay(id)` **payable** | Người vay | Đang `Funded`; `msg.value == principal + interest` | `Repaid`, trả gốc + lãi cho người cho vay, trả thế chấp cho người vay |
| `claimCollateral(id)` | Người cho vay | Đang `Funded`; đã quá hạn | `Defaulted`, thế chấp về người cho vay |
| `getLoan(id)`, `loanCount()`, `dueAt(id)` | Ai cũng được (view) | | Đọc dữ liệu, không tốn gas |

### Sự kiện (giao diện đọc để vẽ bảng và lịch sử)
`LoanRequested(id, borrower, principal, interest, collateral, duration, docHash, purpose)`,
`LoanCancelled(id)`, `LoanFunded(id, lender, fundedAt)`, `LoanRepaid(id, amount)`, `CollateralClaimed(id, lender)`.

### An toàn (contract này GIỮ TIỀN, khác Payments chuyển đi ngay)
- **Checks → Effects → Interactions**: đổi `status` **trước** khi chuyển ETH đi.
- Chống gọi lại (reentrancy): thêm khóa `nonReentrant` (một biến trạng thái, tự viết ~15 dòng có chú thích để dạy).
- Chuyển ETH bằng `call` và `require(ok)`. Rủi ro để thảo luận: nếu người nhận là một contract từ chối nhận ETH thì
  `repay` bị chặn; cách khắc phục là mô hình **"tự rút tiền" (pull payment)**, để dành cho giai đoạn nâng cao.
- Không có hàm nào cho chủ sở hữu rút tiền của người dùng.
- Mọi số tiền so sánh **bằng chính xác** (`==`), không nhận thừa để tránh ETH kẹt trong contract.

## 5. Test bắt buộc (`test/p2pLending.test.js`)

Dùng `test/helpers.js`: `expectRevert`, `increaseTime` (tua nhanh thời gian), `balanceOf`, `txCost`, `ether`.

1. Tạo yêu cầu đúng: contract giữ đúng số thế chấp, phát `LoanRequested`.
2. Từ chối: thế chấp < 150%, vượt mức vay tối đa, lãi > 20%, thời hạn ngoài khoảng.
3. Hủy yêu cầu: trả đủ thế chấp; người khác không hủy được; không hủy khoản đã cấp vốn.
4. Cấp vốn: người vay nhận đúng gốc; không tự cho mình vay; sai số tiền bị từ chối; không cấp vốn hai lần.
5. Trả nợ: người cho vay nhận gốc + lãi, người vay nhận lại thế chấp (tính cả phí gas bằng `txCost`); trả sai số bị từ chối.
6. Quá hạn: trước hạn không thu được thế chấp; `increaseTime(duration + 1)` rồi thu được; người khác không thu được.
7. Sau khi kết thúc (Repaid / Cancelled / Defaulted): mọi thao tác tiếp theo bị từ chối.
8. Số dư contract về 0 sau mỗi vòng đời hoàn chỉnh (không kẹt ETH).

## 6. Giao diện: thẻ "Cho vay" (`js/lending.js`, màu `theme-lending` đã có sẵn trong `style.css`)

| Khu vực | Nội dung | Cần ví? |
|---|---|---|
| **Tạo yêu cầu vay** | Số tiền, lãi, thời hạn, mục đích; tự tính thế chấp tối thiểu; chọn file hợp đồng vay để lấy dấu vân tay (tùy chọn) | Có |
| **Chợ khoản vay** | Các yêu cầu đang chờ: số tiền, lãi (%), thời hạn, thế chấp, người vay + điểm uy tín; nút **Cho vay** | Xem: không |
| **Khoản vay của tôi** | Đang vay / đang cho vay, số phải trả, **đếm ngược đến hạn** (`formatDuration`); nút **Trả nợ** / **Hủy** / **Thu thế chấp** | Có |
| **Lịch sử** | Mọi sự kiện, mã giao dịch bấm được sang thẻ Tra cứu | Không |

## 7. Nền móng đã có sẵn trong mã nguồn

| Đã có | Dùng cho P2P thế nào |
|---|---|
| Cơ chế module (`registerModule` trong `dapp/js/core.js`) | Viết `dapp/js/lending.js` với các móc `init`, `onWalletChanged`, `poll`, `onReadProviderChanged`, `describeTx`; không phải sửa file khác ngoài `index.html` |
| `contracts.json` tự xuất mọi contract trong `contracts/` | Deploy xong `P2PLending` là giao diện có ABI + địa chỉ, chân trang tự có link mã nguồn |
| `runTx({ label, button, build })` | Gửi giao dịch Tạo / Cho vay / Trả nợ / Thu thế chấp với đủ bước: kiểm tra ví, chờ ký, chờ block, nhật ký, số dư |
| `loadReadContract`, `queryLogs`, `logEvent`, `newestFirst`, `addErrorHints` | Đọc contract không cần ví, đọc lịch sử theo đoạn block, ghi sự kiện mới, gợi ý lỗi tiếng Việt |
| `formatEth`, `formatDuration`, `byteLength`, `isMe`, `addrLabel`, `txChip` | Hiển thị số tiền, đếm ngược, kiểm tra độ dài, nhãn "(bạn)", mã giao dịch |
| Thẻ Tra cứu tự nhận giao dịch của mọi contract | Giao dịch gửi tới `P2PLending` hiện "Gọi contract P2PLending · hàm fundLoan()" |
| `test/helpers.js`: `increaseTime`, `txCost`, `balanceOf` | Test quá hạn mà không phải chờ thật; kiểm tra số dư chính xác đến từng wei |
| Thẻ Xác thực (SHA-256 trong trình duyệt) | Tái dùng `hashFile()` để lấy dấu vân tay hợp đồng vay |
| Kiểm duyệt (`BlogModeration`) | Mẫu để làm kiểm duyệt yêu cầu vay ở giai đoạn 2 |

## 8. Các giai đoạn

1. **Giai đoạn 1 – Cơ bản:** contract mục 4 (trừ `claimCollateral`), test, thẻ Cho vay với Tạo / Chợ / Lịch sử.
2. **Giai đoạn 2 – Rủi ro:** quá hạn và thu thế chấp, Khoản vay của tôi (đếm ngược), điểm uy tín (tính ở giao diện từ
   sự kiện, không tốn gas), kiểm duyệt yêu cầu vay.
3. **Giai đoạn 3 – Hồ sơ khoản vay:** dấu vân tay hợp đồng vay, nút kiểm tra file hợp đồng khớp với khoản vay.
4. **Giai đoạn 4 – Nâng cao (đồ án):** nhiều người góp vốn, trả góp, lãi theo thời gian, token "VND thử nghiệm"
   (ERC-20), giá ETH từ oracle (Chainlink trên Sepolia) và thanh lý khi giá thế chấp giảm, mô hình pull payment.
5. **Giai đoạn 5 – Giảng dạy:** kịch bản thực hành 1 buổi (chia vai người vay / cho vay), bài tập, câu hỏi thảo luận.

## 9. Quy trình triển khai (theo `blogchain-truffle/README.md`)

1. Viết `contracts/P2PLending.sol` + `migrations/6_deploy_p2p_lending.js` + `test/p2pLending.test.js`; `npm test` qua hết.
2. Đo phí trên Sepolia (`eth_estimateGas`), báo giảng viên trước khi deploy.
3. `npm run deploy:sepolia` → `npm run verify` → tăng `?v=` của `CONTRACTS_JSON_URL` trong `dapp/js/core.js`.
4. Thêm `js/lending.js`, thẻ + khung nội dung trong `index.html`, thử trên Ganache, tăng `?v=`, commit, push.
5. Cập nhật `HUONG-DAN-THAM-GIA.md` (cách vay / cho vay) và README.

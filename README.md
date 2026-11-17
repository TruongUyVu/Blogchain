# BlogChain

DApp học tập Web3 của **Viện Công nghệ Tài chính – Trường Đại học Đại Nam**: viết blog, chuyển tiền và xác thực
tài liệu trên blockchain. Chạy trên mạng thử nghiệm **Sepolia**, giao diện công khai trên GitHub Pages.

👉 **Dùng thử:** https://truonguyvu.github.io/Blogchain/dapp/

> ⚠️ Đây là mạng **thử nghiệm**: ETH ở đây **không có giá trị thật**. Mọi bài viết, giao dịch và tên tài liệu đều
> **công khai** và **không thể xóa vĩnh viễn**, đừng đăng số điện thoại, CCCD, địa chỉ nhà hay thông tin cá nhân.

## Chức năng

| Thẻ | Làm được gì | Cần ví MetaMask? |
|---|---|---|
| **Blog** | Xem bài viết và lịch sử đăng / sửa / xóa; đăng bài; tác giả sửa hoặc xóa (xóa mềm) bài của mình | Xem: không · Đăng, sửa, xóa: có |
| **Chuyển tiền** | Chuyển ETH thử nghiệm sang ví khác kèm ghi chú; bảng lịch sử chuyển tiền | Xem lịch sử: không · Chuyển: có |
| **Xác thực** | Kéo thả một file để kiểm tra có đúng bản gốc đã đăng ký không; đăng ký hoặc thu hồi tài liệu | Kiểm tra: không · Đăng ký, thu hồi: có |
| **Tra cứu** | Dán mã giao dịch (TX hash) để xem người gửi, người nhận, số tiền, phí gas, trạng thái | Không |
| **Nhật ký** | Ghi lại từng bước: kết nối ví, gửi giao dịch, sự kiện mới trên blockchain, lỗi | Không |

Khi xác thực tài liệu, **file không được tải lên đâu cả**: trình duyệt tự tính "dấu vân tay" SHA-256 của file, chỉ
dấu vân tay và tên tài liệu được ghi lên blockchain. Tự kiểm tra trên Windows bằng PowerShell: `Get-FileHash "đường dẫn file"`.

## Hướng dẫn cho người dùng

1. **Cài MetaMask** (tiện ích cho trình duyệt máy tính, metamask.io) và tạo ví.
   Chỉ dùng ví này cho thử nghiệm, không nạp tiền thật.
2. **Xin Sepolia ETH miễn phí** để trả phí giao dịch (chỉ xem thì không cần):
   - **Sepolia PoW Faucet** (sepolia-faucet.pk910.de): "đào" bằng trình duyệt vài chục phút, không cần tài khoản.
   - **Google Cloud Web3 Faucet**: đăng nhập Google; lượng phát mỗi ngày thay đổi.
   - QuickNode, Alchemy… thường yêu cầu ví có sẵn một ít ETH thật trên mạng chính.
3. **Mở DApp**, bấm **Kết nối ví MetaMask**. Nếu MetaMask đang ở mạng khác, trang hiện nút
   **Chuyển sang Sepolia Testnet**, bấm để đổi mạng.
4. Chọn thẻ chức năng và làm theo hướng dẫn trên trang. Mỗi giao dịch cần xác nhận trong MetaMask và mất khoảng
   15–30 giây; phí khoảng 0,00001 ETH (chuyển tiền, đăng ký tài liệu) đến 0,00006 ETH (đăng bài).

## Kiến trúc

```
Trình duyệt người dùng
 ├─ Đọc dữ liệu (không cần ví) ──► RPC công khai Sepolia (publicnode → Tenderly → 0xrpc.io, tự chuyển khi lỗi)
 └─ Ghi dữ liệu (ký bằng ví)   ──► MetaMask ──► mạng Sepolia
                                                 ├─ BlogChain         (bài viết)
                                                 ├─ Payments          (chuyển tiền)
                                                 └─ DocumentRegistry  (xác thực tài liệu)
Giao diện: HTML/CSS/JS thuần + ethers.js v6, phục vụ bởi GitHub Pages; địa chỉ và ABI contract đọc từ dapp/contracts.json
```

Smart contract trên Sepolia, **mã nguồn đã xác minh** (Sourcify, mức `exact_match`):

| Contract | Địa chỉ | Mã nguồn |
|---|---|---|
| BlogChain | `0x1b59c8aAAa7a258eafe7c708Fc27b6d4e2a7e7F0` | [Sourcify](https://repo.sourcify.dev/11155111/0x1b59c8aAAa7a258eafe7c708Fc27b6d4e2a7e7F0) |
| Payments | `0xaDBF8d7370383A83Eef6d3844b30f285Fc9f7e1c` | [Sourcify](https://repo.sourcify.dev/11155111/0xaDBF8d7370383A83Eef6d3844b30f285Fc9f7e1c) |
| DocumentRegistry | `0xb6a99853dC40129d69D3A0e27438Fd4305A9654A` | [Sourcify](https://repo.sourcify.dev/11155111/0xb6a99853dC40129d69D3A0e27438Fd4305A9654A) |

## Cấu trúc thư mục

```
Blogchain/
├── blogchain-truffle/   # Smart contract (Solidity 0.8.19), migrations, 23 test tự động, script deploy / export / verify
│                        # → hướng dẫn chi tiết cho người phát triển: blogchain-truffle/README.md
├── dapp/                # Giao diện web: index.html, style.css, app.js, contracts.json (ABI + địa chỉ, tạo tự động)
└── chay-dapp.bat        # Chạy giao diện trên máy tại http://localhost:3000 (Windows) khi thử với Ganache
```

## Dành cho người phát triển

Yêu cầu: Node.js 20, Truffle 5.x (`npm i -g truffle`), Ganache (để thử trên máy), MetaMask.
Các bước cài đặt, chạy với Ganache, deploy lên Sepolia, xác minh mã nguồn và xử lý lỗi:
xem **[blogchain-truffle/README.md](blogchain-truffle/README.md)**.

## Lưu ý an toàn

- Không bao giờ đưa file `.env`, private key hay cụm từ khôi phục (seed phrase) lên GitHub hoặc gửi cho người khác.
  `.gitignore` đã chặn `.env`, nhưng hãy kiểm tra trước mỗi lần commit.
- Ví dùng để deploy chỉ chứa ETH thử nghiệm; không dùng ví đó cho tiền thật.
- Smart contract trên blockchain không sửa được: deploy contract mới thì dữ liệu cũ vẫn nằm ở contract cũ.

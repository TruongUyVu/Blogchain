# Cùng phát triển BlogChain

Tài liệu cho trợ giảng và sinh viên muốn **sửa mã nguồn, thêm chức năng** hoặc **tự dựng một bản BlogChain riêng** làm đồ án.
Chỉ muốn dùng DApp (đăng bài, chuyển tiền): xem [HUONG-DAN-THAM-GIA.md](HUONG-DAN-THAM-GIA.md).

## Ba cách tham gia

| Cách | Phù hợp với | Bản chính có bị ảnh hưởng? |
|---|---|---|
| **A. Fork và gửi đề xuất (Pull Request)** | Sinh viên muốn đóng góp sửa lỗi, giao diện, chức năng | Chỉ khi chủ repo duyệt và gộp |
| **B. Cộng tác viên** (chủ repo mời) | Trợ giảng, người được tin cậy | Có: sửa trực tiếp vào repo |
| **C. Tự dựng bản riêng** | Đồ án, bài tập lớn | Không: bản của bạn chạy độc lập |

## Chuẩn bị (mọi cách đều cần)

1. Tài khoản GitHub, Git, Node.js 20, Truffle 5.x (`npm i -g truffle`), Ganache, MetaMask.
2. Lấy mã nguồn (cách A, C: fork trước rồi clone **bản fork của bạn**):

```
git clone https://github.com/<tên-github-của-bạn>/Blogchain.git
cd Blogchain\blogchain-truffle
npm install
```

3. Cài đặt chi tiết, các lệnh `npm run ...`, chạy thử với Ganache: xem [blogchain-truffle/README.md](blogchain-truffle/README.md).

> **Mỗi người dùng ví và file `.env` của riêng mình.** Không xin, không gửi private key hay cụm từ khôi phục cho nhau.
> File `.env` đã bị `.gitignore` chặn; kiểm tra `git status` trước mỗi lần commit.

## A. Fork và gửi Pull Request

1. Trên trang https://github.com/TruongUyVu/Blogchain bấm **Fork**, rồi clone bản fork như trên.
2. Tạo nhánh riêng cho mỗi việc: `git checkout -b sua-giao-dien-blog`.
3. Sửa mã, rồi **tự kiểm tra** (xem [Danh sách kiểm tra](#danh-sách-kiểm-tra-trước-khi-gửi)).
4. Commit với lời nhắn tiếng Việt rõ ràng, `git push origin sua-giao-dien-blog`.
5. Trên GitHub bấm **Compare & pull request**. Mô tả: sửa gì, vì sao, đã thử thế nào, kèm ảnh chụp màn hình nếu đổi giao diện.
6. Chủ repo xem, góp ý hoặc gộp. Sau khi gộp, khoảng 1 phút sau trang công khai có bản mới.

## B. Cộng tác viên

Chủ repo vào **Settings → Collaborators → Add people**, nhập tên GitHub. Người được mời bấm chấp nhận trong email.
Cộng tác viên push thẳng được lên repo, nên vẫn nên **làm trên nhánh riêng và mở Pull Request** để chủ repo xem trước,
không push thẳng lên `main`.

## C. Tự dựng bản BlogChain riêng

1. **Fork** repo về tài khoản của bạn.
2. Bản fork → **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**. Khoảng 1 phút sau có link
   `https://<tên-github-của-bạn>.github.io/Blogchain/dapp/`.
   Lúc này trang vẫn **đọc dữ liệu từ contract của bản gốc** (địa chỉ nằm trong `dapp/contracts.json`).
3. Deploy contract **của bạn** lên Sepolia:
   - Tạo `.env` (xem `blogchain-truffle/.env.example`) với private key của **một ví riêng để deploy**.
   - Ví cần có Sepolia ETH: phí deploy cả 5 contract thường dưới 0,01 ETH (đo thật trên mạng, thay đổi theo
     độ đông của Sepolia); số dư nên có khoảng 0,02 ETH vì mạng yêu cầu số dư ≥ gas tối đa × trần phí.
   - Chạy `npm run deploy:sepolia`. Lệnh này deploy mới cả 5 contract (thư mục `build/` không có trên Git nên Truffle
     coi như chưa deploy gì) và ghi địa chỉ mới vào `dapp/contracts.json`.
4. Tăng `?v=` của `CONTRACTS_JSON_URL` trong `dapp/js/core.js`, commit, push. Trang của bạn giờ chạy với dữ liệu riêng;
   ví deploy là **chủ sở hữu** contract kiểm duyệt của bạn.
5. Muốn thêm chức năng mới: viết contract + test + migration mới, chạy thử trên Ganache, rồi deploy riêng contract đó
   (hướng dẫn ở [blogchain-truffle/README.md](blogchain-truffle/README.md)).

## Quy tắc khi sửa mã

- **Contract đã deploy không sửa được.** Sửa file `.sol` của contract đang chạy rồi deploy lại nghĩa là tạo contract
  **mới**, dữ liệu cũ nằm lại ở contract cũ. Trong bản chính, việc deploy lên Sepolia và cập nhật `dapp/contracts.json`
  do **chủ repo** làm; Pull Request chỉ gửi mã nguồn, test và migration.
- Contract mới phải có **test** trong `blogchain-truffle/test/` (xem các file test sẵn có để làm theo).
- Thử giao diện trên Ganache bằng cách đổi `const NET = NETWORKS.sepolia;` thành `NETWORKS.ganache` trong `dapp/js/core.js`,
  và **đổi lại trước khi commit**.
- Sửa file `.js` trong `dapp/` hoặc `dapp/style.css` thì **tăng `?v=`** tương ứng trong `dapp/index.html`, nếu không trình duyệt
  của người dùng vẫn chạy bản cũ.
- Giao diện viết bằng HTML/CSS/JS thuần, không framework; chèn nội dung người dùng bằng `textContent`, **không dùng
  `innerHTML`** với dữ liệu đọc từ blockchain.

## Danh sách kiểm tra trước khi gửi

- [ ] `npm test` (trong `blogchain-truffle`, đang mở Ganache) chạy qua toàn bộ test
- [ ] Đã thử trên giao diện với Ganache; `dapp/js/core.js` đã đổi lại `NETWORKS.sepolia`
- [ ] Đã tăng `?v=` nếu sửa file `.js` / `style.css`
- [ ] `git status` không có `.env`, private key, thư mục `build/` hay `node_modules/`
- [ ] Mô tả Pull Request nêu rõ: sửa gì, vì sao, đã thử thế nào

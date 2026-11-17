/*
 * app.js – khởi động DApp. File này phải được nạp SAU CÙNG trong index.html:
 *   ethers → js/core.js (lõi) → các module (js/blog.js, js/transfer.js, js/docs.js, js/lookup.js, ...) → app.js
 *
 * Thêm một chức năng mới (ví dụ cho vay P2P): tạo js/<tên>.js gọi registerModule({...}), thêm thẻ + khung nội dung
 * vào index.html, và thêm <script src="js/<tên>.js"> TRƯỚC dòng nạp app.js. Không cần sửa core.js hay module khác.
 * Hướng dẫn chi tiết: blogchain-truffle/README.md, mục "Thêm một chức năng mới".
 */
startApp();

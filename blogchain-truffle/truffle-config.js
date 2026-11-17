/**
 * Cấu hình Truffle cho dự án BlogChain.
 *
 * Hai mạng:
 *  - development: Ganache trên máy (học tập, chạy cục bộ).
 *  - sepolia: testnet công khai, để người khác truy cập DApp qua Internet.
 *    Cần file .env (copy từ .env.example) chứa SEPOLIA_RPC_URL và PRIVATE_KEY.
 *    Deploy: truffle migrate --network sepolia
 *
 * Lưu ý:
 *  - Ganache bản giao diện (GUI) mặc định chạy ở cổng 7545 (ganache-cli dùng 8545).
 *    Nếu workspace của Cụ dùng cổng khác, hãy sửa "port" bên dưới cho khớp.
 *  - Ganache không hiểu một số lệnh EVM mới (ví dụ PUSH0 của Solidity >= 0.8.20),
 *    vì vậy cố định solc 0.8.19 và evmVersion "paris" để tránh lỗi "invalid opcode".
 */
require("dotenv").config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Chấp nhận mọi network id (Ganache thường là 5777 / chainId 1337)
    },

    sepolia: {
      // Chỉ tạo provider khi thật sự dùng mạng sepolia, để chạy Ganache không cần .env
      provider: () => {
        const HDWalletProvider = require("@truffle/hdwallet-provider");
        const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;
        if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
          throw new Error("Thiếu SEPOLIA_RPC_URL hoặc PRIVATE_KEY trong file .env (xem .env.example)");
        }
        return new HDWalletProvider({
          privateKeys: [PRIVATE_KEY.replace(/^0x/, "")],
          providerOrUrl: SEPOLIA_RPC_URL,
        });
      },
      network_id: 11155111, // Chain ID của Sepolia
      // Phí gas: Truffle mặc định tip 2.5 gwei, trong khi Sepolia gần như trống (base fee ~0)
      // nên tip 0.05 gwei vẫn được đưa vào block → rẻ hơn khoảng 50 lần.
      maxPriorityFeePerGas: 50000000, // 0.05 gwei (tính bằng wei)
      maxFeePerGas: 2000000000, // trần 2 gwei; thực trả = base fee + tip, phần dư không bị trừ
      confirmations: 2, // Chờ 2 block xác nhận cho chắc
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },

  mocha: {
    timeout: 100000,
  },

  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: { enabled: false, runs: 200 },
        evmVersion: "paris",
      },
    },
  },
};

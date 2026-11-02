/**
 * Cấu hình Truffle cho dự án BlogChain (học tập, chạy cục bộ với Ganache).
 *
 * Lưu ý:
 *  - Ganache bản giao diện (GUI) mặc định chạy ở cổng 7545 (ganache-cli dùng 8545).
 *    Nếu workspace của Cụ dùng cổng khác, hãy sửa "port" bên dưới cho khớp.
 *  - Ganache không hiểu một số lệnh EVM mới (ví dụ PUSH0 của Solidity >= 0.8.20),
 *    vì vậy cố định solc 0.8.19 và evmVersion "paris" để tránh lỗi "invalid opcode".
 */
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Chấp nhận mọi network id (Ganache thường là 5777 / chainId 1337)
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

/**
 * Xuất ABI + địa chỉ các contract (lấy từ build/contracts của Truffle) ra dapp/contracts.json
 * để giao diện web tự đọc, không phải chép tay địa chỉ / ABI vào app.js sau mỗi lần deploy.
 *
 * Chạy: npm run export   (npm run deploy:sepolia và deploy:ganache tự chạy lệnh này sau khi deploy)
 */
const fs = require("fs");
const path = require("path");

const CONTRACTS = ["BlogChain", "Payments", "DocumentRegistry"];

// Mạng cần xuất: id mạng trong artifact của Truffle → RPC để tra số block lúc deploy
const NETWORKS = {
  11155111: "https://ethereum-sepolia-rpc.publicnode.com", // Sepolia
  5777: "http://127.0.0.1:7545", // Ganache GUI
};

const BUILD_DIR = path.join(__dirname, "..", "build", "contracts");
const OUT_FILE = path.join(__dirname, "..", "..", "dapp", "contracts.json");

// Số block của giao dịch deploy: giao diện đọc lịch sử sự kiện từ block này thay vì từ 0
async function deployBlock(rpcUrl, txHash) {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] }),
    });
    const { result } = await res.json();
    return result ? parseInt(result.blockNumber, 16) : 0;
  } catch {
    return 0; // RPC không trả lời (ví dụ đang tắt Ganache) → giao diện đọc từ block 0
  }
}

(async () => {
  const out = { generatedAt: new Date().toISOString(), abi: {}, networks: {} };

  for (const name of CONTRACTS) {
    const file = path.join(BUILD_DIR, `${name}.json`);
    if (!fs.existsSync(file)) {
      console.error(`Không thấy ${file}. Hãy chạy "truffle compile" trước.`);
      process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(file, "utf8"));
    out.abi[name] = artifact.abi;

    for (const [netId, rpcUrl] of Object.entries(NETWORKS)) {
      const deployed = artifact.networks[netId];
      if (!deployed) continue;
      out.networks[netId] = out.networks[netId] || {};
      out.networks[netId][name] = {
        address: deployed.address,
        deployBlock: await deployBlock(rpcUrl, deployed.transactionHash),
      };
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(`Đã ghi ${path.relative(process.cwd(), OUT_FILE)}`);
  for (const [netId, list] of Object.entries(out.networks)) {
    for (const [name, d] of Object.entries(list)) {
      console.log(`  mạng ${netId.padEnd(8)} ${name.padEnd(17)} ${d.address}  (block ${d.deployBlock})`);
    }
  }
})();

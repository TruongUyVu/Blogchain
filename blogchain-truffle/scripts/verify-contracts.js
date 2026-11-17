/**
 * Xác minh mã nguồn (verify) các contract đã deploy trên Sepolia:
 *  - Sourcify (https://sourcify.dev): không cần khóa API.
 *  - Etherscan: cần ETHERSCAN_API_KEY trong file .env (bỏ qua nếu chưa có).
 *
 * Trước khi gửi, script so mã đã biên dịch với mã đang chạy trên chuỗi; KHÔNG khớp thì không gửi
 * (thường do biên dịch khác thiết lập lúc deploy, ví dụ bật / tắt optimizer).
 *
 * Chạy:
 *   npm run verify                  contract deploy khi optimizer BẬT (dùng build/contracts)
 *   npm run verify:legacy           3 contract đầu tiên, deploy khi optimizer còn TẮT
 *   node scripts/verify-contracts.js --build <thư mục build> [Tên contract ...]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");

const CHAIN_ID = 11155111; // Sepolia
const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const SOURCIFY = "https://sourcify.dev/server";
const ETHERSCAN = "https://api.etherscan.io/v2/api";
const ROOT = path.join(__dirname, "..");
const MAIN_BUILD = path.join(ROOT, "build", "contracts"); // nơi Truffle ghi địa chỉ đã deploy (networks)

const args = process.argv.slice(2);
const buildIdx = args.indexOf("--build");
const BUILD_DIR = buildIdx >= 0 ? path.resolve(ROOT, args[buildIdx + 1]) : MAIN_BUILD;
const names = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--build");
const CONTRACTS = names.length ? names : ["BlogChain", "Payments", "DocumentRegistry", "BlogModeration"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// Dựng "standard JSON input" (mã nguồn + thiết lập trình biên dịch) từ metadata Truffle ghi trong artifact
function standardJsonInput(artifact) {
  const meta = JSON.parse(artifact.metadata);
  const sources = {};
  for (const key of Object.keys(meta.sources)) {
    const file = path.join(ROOT, key.replace(/^project:\//, ""));
    sources[key] = { content: fs.readFileSync(file, "utf8") };
  }
  const { compilationTarget, ...settings } = meta.settings;
  settings.outputSelection = { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] } };
  const [sourceKey, contractName] = Object.entries(compilationTarget)[0];
  return {
    input: { language: "Solidity", sources, settings },
    compilerVersion: meta.compiler.version, // ví dụ 0.8.19+commit.7dd6d404
    contractIdentifier: `${sourceKey}:${contractName}`,
    optimizer: settings.optimizer.enabled,
  };
}

async function verifySourcify(address, job, txHash) {
  const existing = await fetch(`${SOURCIFY}/v2/contract/${CHAIN_ID}/${address}`);
  if (existing.ok) {
    const info = await existing.json();
    if (info.match) return `đã xác minh từ trước (${info.match})`;
  }
  const res = await fetch(`${SOURCIFY}/v2/verify/${CHAIN_ID}/${address}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      stdJsonInput: job.input,
      compilerVersion: job.compilerVersion,
      contractIdentifier: job.contractIdentifier,
      creationTransactionHash: txHash,
    }),
  });
  const ticket = await res.json();
  if (!ticket.verificationId) return `LỖI: ${ticket.message || JSON.stringify(ticket).slice(0, 200)}`;
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const status = await (await fetch(`${SOURCIFY}/v2/verify/${ticket.verificationId}`)).json();
    if (status.isJobCompleted) {
      if (status.error) return `LỖI: ${status.error.message || status.error.customCode}`;
      return `thành công (${status.contract.match})`;
    }
  }
  return "chưa xong sau 2 phút, hãy kiểm tra lại sau";
}

async function verifyEtherscan(address, job) {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) return "bỏ qua (chưa có ETHERSCAN_API_KEY trong .env)";
  const q = (params) => `${ETHERSCAN}?${new URLSearchParams({ chainid: CHAIN_ID, apikey: key, ...params })}`;

  const current = await (await fetch(q({ module: "contract", action: "getsourcecode", address }))).json();
  if (current.status === "1" && current.result[0] && current.result[0].SourceCode) return "đã xác minh từ trước";

  const body = new URLSearchParams({
    codeformat: "solidity-standard-json-input",
    sourceCode: JSON.stringify(job.input),
    contractaddress: address,
    contractname: job.contractIdentifier,
    compilerversion: `v${job.compilerVersion}`,
  });
  const submit = await (await fetch(q({ module: "contract", action: "verifysourcecode" }), { method: "POST", body })).json();
  if (submit.status !== "1") return `LỖI: ${submit.result}`;
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const st = await (await fetch(q({ module: "contract", action: "checkverifystatus", guid: submit.result }))).json();
    if (!/pending/i.test(st.result)) return st.status === "1" || /already verified/i.test(st.result) ? `thành công (${st.result})` : `LỖI: ${st.result}`;
  }
  return "chưa xong sau 2 phút, hãy kiểm tra lại sau";
}

(async () => {
  console.log(`Thư mục build: ${path.relative(ROOT, BUILD_DIR)}`);
  for (const name of CONTRACTS) {
    const deployed = JSON.parse(fs.readFileSync(path.join(MAIN_BUILD, `${name}.json`), "utf8")).networks[CHAIN_ID];
    if (!deployed) {
      console.log(`\n${name}: chưa deploy trên Sepolia, bỏ qua`);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${name}.json`), "utf8"));
    const job = standardJsonInput(artifact);
    console.log(`\n${name} ${deployed.address} (optimizer ${job.optimizer ? "bật" : "tắt"})`);

    let onChain = (await rpc("eth_getCode", [deployed.address, "latest"])).toLowerCase();
    // Biến immutable (ví dụ địa chỉ blog trong BlogModeration) được ghi vào mã lúc deploy, còn mã biên dịch để số 0
    // ở các vị trí đó → xóa về 0 trên mã lấy từ chuỗi trước khi so sánh
    for (const refs of Object.values(artifact.immutableReferences || {})) {
      for (const { start, length } of refs) {
        const s = 2 + start * 2;
        onChain = onChain.slice(0, s) + "0".repeat(length * 2) + onChain.slice(s + length * 2);
      }
    }
    if (onChain !== artifact.deployedBytecode.toLowerCase()) {
      console.log("  KHÔNG gửi: mã biên dịch khác mã đang chạy trên chuỗi (sai thiết lập biên dịch?)");
      continue;
    }
    console.log("  Mã biên dịch khớp 100% với mã trên chuỗi");
    console.log(`  Sourcify : ${await verifySourcify(deployed.address, job, deployed.transactionHash)}`);
    console.log(`  Etherscan: ${await verifyEtherscan(deployed.address, job)}`);
  }
})();

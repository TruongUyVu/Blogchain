/*
 * core.js – phần lõi dùng chung của DApp BlogChain:
 *   mạng & nguồn RPC, nạp contract từ contracts.json, ví MetaMask, gửi giao dịch, nhật ký / thông báo,
 *   theo dõi sự kiện mới, và CƠ CHẾ MODULE để gắn thêm chức năng.
 *
 * Mỗi chức năng (blog, chuyển tiền, xác thực, tra cứu, sau này là cho vay P2P...) nằm trong một file riêng
 * ở thư mục js/ và tự đăng ký bằng registerModule({...}). Lõi gọi các "móc" (hook) của module đúng lúc:
 *   init()                    mở trang, sau khi đã kết nối nguồn dữ liệu (đọc không cần ví)
 *   onWalletChanged()         vừa kết nối ví hoặc đổi tài khoản trong MetaMask
 *   poll(from, latest)        có block mới: đọc sự kiện trong khoảng block đó (lỗi thì lần sau đọc lại)
 *   onReadProviderChanged()   nguồn RPC vừa đổi sang nguồn dự phòng: gắn lại contract vào readProvider
 *   describeTx(tx)            (tùy chọn) giải thích một giao dịch gửi tới contract của module, cho thẻ Tra cứu
 * Thứ tự <script> trong index.html: ethers → js/core.js → các module → app.js (khởi động).
 */

// ---------- Trạng thái dùng chung ----------
let provider = null; // provider của MetaMask (chỉ có sau khi bấm Kết nối ví)
let signer = null; // tài khoản ký giao dịch
let userAccount = null; // địa chỉ ví đang kết nối

const connectWalletBtn = document.getElementById('connectWalletBtn');
const connectBtnText = document.getElementById('connectBtnText');
const networkStatusDot = document.getElementById('networkStatusDot');
const networkNameEl = document.getElementById('networkName');
const walletAddressEl = document.getElementById('walletAddress');
const walletBalanceEl = document.getElementById('walletBalance');
const logsContainer = document.getElementById('logsContainer');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const switchNetworkBtn = document.getElementById('switchNetworkBtn');
const onboardCard = document.getElementById('onboardCard');
const toastArea = document.getElementById('toastArea');

const WAIT_SIGN_TEXT = 'Đang chờ ký trong MetaMask...';
const WAIT_MINED_TEXT = 'Đang chờ xác nhận trên blockchain...';

// Các mạng DApp hỗ trợ.
//  - artifactNetworkId: id mạng mà Truffle ghi trong build/contracts (khóa "networks" của contracts.json).
//  - Địa chỉ và block deploy của từng contract KHÔNG khai báo ở đây: lấy từ contracts.json (xem DEPLOYED).
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    artifactNetworkId: '11155111',
    label: 'Sepolia Testnet',
    priorityFeeGwei: '0.05', // tip trả cho validator, xem feeOverrides()
    // Các nguồn RPC công khai để ai cũng đọc được dữ liệu, không cần ví. Thử lần lượt từ trên xuống.
    //  - logChunk: số block tối đa mỗi lần đọc lịch sử sự kiện (eth_getLogs) mà nguồn đó cho phép.
    //  - batch: false = gửi từng lệnh riêng. Tenderly treo khi nhận gói gộp nhiều lệnh eth_getLogs + eth_call
    //    (đã kiểm tra), nên chỉ gộp lệnh với nguồn đã thử là xử lý tốt.
    readRpcs: [
      { url: 'https://ethereum-sepolia-rpc.publicnode.com', logChunk: 45000, batch: true },
      { url: 'https://sepolia.gateway.tenderly.co', logChunk: 45000, batch: false },
      { url: 'https://0xrpc.io/sep', logChunk: 9000, batch: false }
    ],
    explorer: 'https://sepolia.etherscan.io',
    // Trang xem mã nguồn contract đã xác minh (npm run verify / verify:legacy trong blogchain-truffle)
    sourceViewer: 'https://repo.sourcify.dev/11155111/',
    params: {
      chainId: '0xaa36a7',
      chainName: 'Sepolia',
      rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.gateway.tenderly.co'],
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['https://sepolia.etherscan.io']
    }
  },
  ganache: {
    chainId: 1337,
    artifactNetworkId: '5777', // Ganache GUI
    label: 'Ganache Local',
    priorityFeeGwei: null, // Ganache: để MetaMask tự chọn phí
    readRpcs: [{ url: 'http://127.0.0.1:7545', logChunk: 45000, batch: true }],
    explorer: null,
    params: {
      chainId: '0x539',
      chainName: 'Ganache Local',
      rpcUrls: ['http://127.0.0.1:7545'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
    }
  }
};

// Mạng đang dùng. Chạy thử trên máy với Ganache thì đổi thành NETWORKS.ganache (nhớ đổi lại trước khi commit)
const NET = NETWORKS.sepolia;

// ---------- Kho contract: ABI + địa chỉ đọc từ contracts.json ----------
// contracts.json do lệnh "npm run export" (blogchain-truffle) tạo ra sau mỗi lần deploy; tăng ?v= khi file đổi.
const CONTRACTS_JSON_URL = 'contracts.json?v=3';
const ABI = {}; // tên contract → ABI
const DEPLOYED = {}; // tên contract → { address, deployBlock } trên mạng NET

async function loadContractsConfig() {
  const res = await fetch(CONTRACTS_JSON_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`không tải được contracts.json (HTTP ${res.status})`);
  const cfg = await res.json();
  Object.assign(ABI, cfg.abi);
  Object.assign(DEPLOYED, cfg.networks[NET.artifactNetworkId] || {});
}

// Địa chỉ / block deploy của một contract trên mạng đang dùng ('' / 0 nếu chưa deploy)
function contractAddress(name) {
  return (DEPLOYED[name] && DEPLOYED[name].address) || '';
}

function deployBlockOf(name) {
  return (DEPLOYED[name] && DEPLOYED[name].deployBlock) || 0;
}

// Tạo đối tượng contract để ĐỌC (gắn readProvider). Trả về null nếu contract chưa deploy trên mạng này
// hoặc địa chỉ không có mã (hay gặp khi Ganache bị đặt lại). Khi gửi giao dịch: c.connect(signer).
async function loadReadContract(name, label = name) {
  const address = contractAddress(name);
  if (!address || !ABI[name]) return null;
  const code = await readProvider.getCode(address);
  if (code === '0x') {
    addLog(`Không tìm thấy contract ${label} trên mạng ${NET.label}.`, 'error');
    return null;
  }
  return new ethers.Contract(address, ABI[name], readProvider);
}

// ---------- Cơ chế module ----------
const MODULES = [];

function registerModule(mod) {
  MODULES.push(mod);
}

// Gọi một móc trên mọi module cùng lúc; lỗi của module này không làm hỏng module khác
async function runModuleHook(hook, ...args) {
  await Promise.all(MODULES.map(async (m) => {
    if (typeof m[hook] !== 'function') return;
    try {
      await m[hook](...args);
    } catch (error) {
      console.error(`[${m.name}] ${hook}`, error);
      addLog(`Lỗi ở chức năng ${m.name}: ${errorReason(error)}`, 'error');
    }
  }));
}

// Provider chỉ để ĐỌC dữ liệu qua RPC công khai: ai mở trang cũng xem được bài viết và lịch sử, không cần MetaMask.
// Ghi dữ liệu (đăng bài, chuyển tiền) vẫn phải ký bằng ví qua `signer`.
let readProvider = null;
let readRpcUrl = null; // nguồn RPC đang dùng

// RPC công khai giới hạn số block mỗi lần đọc sự kiện → chia khoảng block thành từng đoạn (theo nguồn đang dùng)
let LOG_CHUNK = 45000;
const RPC_TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('quá thời gian chờ')), ms))]);
}

// Chọn nguồn RPC để đọc: thử lần lượt NET.readRpcs, dùng nguồn đầu tiên trả lời đúng mạng.
// Nguồn chính chậm / ngừng hoạt động thì trang tự dùng nguồn dự phòng.
async function connectReadProvider() {
  for (const rpc of NET.readRpcs) {
    const p = new ethers.JsonRpcProvider(rpc.url, NET.chainId, { staticNetwork: true, batchMaxCount: rpc.batch ? 100 : 1 });
    try {
      const chainId = Number(await withTimeout(p.send('eth_chainId', []), RPC_TIMEOUT_MS));
      if (chainId !== NET.chainId) throw new Error(`sai mạng (Chain ID ${chainId})`);
      await withTimeout(p.getBlockNumber(), RPC_TIMEOUT_MS);
      if (readProvider) readProvider.destroy();
      readProvider = p;
      readRpcUrl = rpc.url;
      LOG_CHUNK = rpc.logChunk;
      addLog(`Đọc dữ liệu blockchain qua ${new URL(rpc.url).host}`, 'info');
      return;
    } catch (error) {
      p.destroy();
      addLog(`Nguồn dữ liệu ${new URL(rpc.url).host} không trả lời (${error.message || error}), thử nguồn dự phòng...`, 'info');
    }
  }
  throw new Error('không kết nối được nguồn dữ liệu blockchain nào');
}

// Đổi nguồn RPC khi đang dùng mà nguồn cũ lỗi: gắn lại các contract vào nguồn mới
async function reconnectReadProvider() {
  await connectReadProvider();
  await runModuleHook('onReadProviderChanged');
}

async function queryLogs(c, filter, fromBlock) {
  const latest = await readProvider.getBlockNumber();
  const out = [];
  for (let start = fromBlock; start <= latest; start += LOG_CHUNK) {
    out.push(...await c.queryFilter(filter, start, Math.min(start + LOG_CHUNK - 1, latest)));
  }
  return out;
}

// Trước mỗi giao dịch: phải có ví và ví phải ở đúng mạng
// (nếu không kiểm tra, MetaMask đang ở mạng khác - kể cả mạng thật - vẫn gửi giao dịch đi)
async function ensureWallet() {
  if (!signer) {
    addLog('Hãy kết nối ví MetaMask để thực hiện giao dịch.', 'warn');
    await connectWallet();
    if (!signer) return false;
  }
  const chainIdNow = Number((await provider.getNetwork()).chainId);
  if (chainIdNow !== NET.chainId) {
    addLog(`Ví đang ở sai mạng (Chain ID ${chainIdNow}). Bấm "Chuyển sang ${NET.label}" rồi thử lại.`, 'warn');
    return false;
  }
  return true;
}

// Thêm (nếu chưa có) và chuyển MetaMask sang mạng của DApp
async function switchNetwork() {
  if (typeof window.ethereum === 'undefined') {
    addLog('Không tìm thấy MetaMask!', 'error');
    return;
  }
  try {
    addLog(`Đang yêu cầu MetaMask chuyển sang mạng ${NET.label}...`, 'info');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NET.params.chainId }]
      });
    } catch (switchError) {
      const msg = String(switchError.message || '');
      const notAdded = switchError.code === 4902 || /unrecognized chain|not been added/i.test(msg);
      if (!notAdded) throw switchError;
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [NET.params]
      });
    }
    addLog(`Đã chuyển sang mạng ${NET.label}. Hãy bấm "Kết nối MetaMask" nếu số dư chưa cập nhật.`, 'success');
  } catch (error) {
    console.error(error);
    addLog(`Không chuyển được mạng: ${error.message || error}. Hãy mở MetaMask và chọn mạng ${NET.label} thủ công.`, 'error');
  }
}

// Phí gas gợi ý cho MetaMask: tip nhỏ (NET.priorityFeeGwei) + trần = 2 × base fee của block mới nhất + tip.
// Ví mặc định thường đặt tip 1-2.5 gwei, trong khi Sepolia gần như trống nên tip 0.05 gwei vẫn được đưa vào block.
// MetaMask hiện mức này là "Site suggested"; người dùng vẫn đổi được nếu muốn.
async function feeOverrides() {
  if (!NET.priorityFeeGwei) return {};
  const block = await readProvider.getBlock('latest');
  const tip = ethers.parseUnits(NET.priorityFeeGwei, 'gwei');
  return { maxPriorityFeePerGas: tip, maxFeePerGas: block.baseFeePerGas * 2n + tip };
}

// Tùy chọn cho một giao dịch: phí gas (feeOverrides) + giới hạn gas = ước tính + 30% dự phòng.
// Giao dịch xóa bớt dữ liệu (ví dụ sửa bài cho ngắn lại) được hoàn gas sau khi chạy xong, nhưng lúc chạy
// vẫn cần đủ gas "trước hoàn"; dùng đúng số ước tính có thể bị "out of gas" (đã gặp trên Ganache).
// Gas dư không dùng hết thì không bị tính phí.
async function txOptions(method, args, extra = {}) {
  const opts = { ...extra, ...(await feeOverrides()) };
  const estimate = await method.estimateGas(...args, opts);
  return { ...opts, gasLimit: (estimate * 13n) / 10n };
}

// Helper: Logging. Lỗi và cảnh báo luôn hiện thông báo nổi; thông báo thành công chỉ hiện khi truyền toast = true
function addLog(message, type = 'info', toast = false) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${timestamp}] ${message}`;
  logsContainer.appendChild(entry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
  if (toast || type === 'error' || type === 'warn') showToast(message, type);
}

// Thông báo nổi ở góc màn hình, tự ẩn sau vài giây
function showToast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  toastArea.appendChild(el);
  while (toastArea.children.length > 3) toastArea.firstChild.remove();
  setTimeout(() => el.remove(), type === 'error' ? 9000 : 5000);
}

// Chuyển giữa các thẻ chức năng (Blog / Chuyển tiền / Tra cứu / Nhật ký), nhớ thẻ đang mở
function showTab(name) {
  for (const t of document.querySelectorAll('.tab')) t.setAttribute('aria-selected', String(t.dataset.tab === name));
  for (const p of document.querySelectorAll('.tab-panel')) p.hidden = p.dataset.panel !== name;
  try { localStorage.setItem('blogchain-tab', name); } catch {}
}

// Helper: Rút gọn địa chỉ ví
function shortAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Helper: Đổi timestamp (giây, BigInt) sang ngày giờ
function formatTime(ts) {
  return new Date(Number(ts) * 1000).toLocaleString('vi-VN');
}

// Helper: Lấy lý do revert từ lỗi của ethers (ví dụ "Only the author can do this")
function errorReason(error) {
  // ethers v6 đôi khi chỉ báo "could not coalesce error": lấy lỗi thật nằm sâu bên trong
  const inner =
    (error.error && (error.error.message || (error.error.data && error.error.data.message))) ||
    (error.info && error.info.error && error.info.error.message) ||
    (error.data && error.data.message) ||
    (error.payload && error.error && error.error.message) ||
    '';
  const base = error.reason || error.shortMessage || error.message || String(error);
  const text = (inner ? `${base} | Chi tiết: ${inner}` : base);

  // Gợi ý nguyên nhân thường gặp bằng tiếng Việt: lấy gợi ý đầu tiên khớp (của lõi hoặc do module thêm vào)
  const all = `${text} ${JSON.stringify(error.error || {})}`.toLowerCase();
  const found = ERROR_HINTS.find(([pattern]) => all.includes(pattern));
  const hint = found ? found[1] : (all.includes('revert') ? 'hợp đồng từ chối giao dịch (kiểm tra quyền và dữ liệu nhập).' : '');
  return hint ? `${text} → GỢI Ý: ${hint}` : text;
}

// Gợi ý lỗi: [chuỗi tìm trong thông báo lỗi (chữ thường), lời giải thích]. Module thêm gợi ý riêng bằng addErrorHints.
// Chuỗi tìm thường là lý do revert trong contract, ví dụ require(..., "Only the author can do this").
const ERROR_HINTS = [
  ['nonce', 'MetaMask lệch nonce (hay gặp sau khi Ganache khởi động lại). Vào MetaMask > Settings > Advanced > Clear activity tab data.'],
  ['insufficient funds', 'tài khoản đang chọn không đủ ETH để trả phí gas. Trên Sepolia, xin ETH miễn phí ở một "Sepolia faucet".'],
  ["doesn't have enough funds", 'tài khoản đang chọn không đủ ETH để trả phí gas. Trên Sepolia, xin ETH miễn phí ở một "Sepolia faucet".'],
];

function addErrorHints(list) {
  ERROR_HINTS.push(...list);
}

// Số byte UTF-8 của chuỗi (contract giới hạn độ dài theo byte; tiếng Việt có dấu chiếm 2-3 byte mỗi ký tự)
function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

// Số ETH dễ đọc từ wei (BigInt), ví dụ 1500000000000000n → "0.0015 ETH"
function formatEth(wei) {
  return `${ethers.formatEther(wei)} ETH`;
}

// Khoảng thời gian (giây) dễ đọc, ví dụ 93784 → "1 ngày 2 giờ 3 phút" (dùng cho đếm ngược, thời hạn)
function formatDuration(seconds) {
  let s = Math.max(0, Math.floor(Number(seconds)));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const parts = [];
  if (d) parts.push(`${d} ngày`);
  if (h) parts.push(`${h} giờ`);
  if (m) parts.push(`${m} phút`);
  if (!d && !h && (s || !parts.length)) parts.push(`${s} giây`);
  return parts.join(' ');
}

// Gửi MỘT giao dịch theo các bước chuẩn, dùng chung cho mọi chức năng:
//   kiểm tra ví & mạng → khóa nút, chờ ký → phát giao dịch → chờ được ghi vào block → ghi nhật ký, cập nhật số dư.
//   build(signer) trả về giao dịch đã gửi, ví dụ: async (s) => { const c = myContract.connect(s);
//                                                   return c.myFn(a, b, await txOptions(c.myFn, [a, b])); }
// Trả về receipt nếu thành công, null nếu người dùng từ chối / lỗi (đã ghi nhật ký).
async function runTx({ label, build, button = null, successMessage = null }) {
  if (!(await ensureWallet())) return null;
  const idleText = button ? button.textContent : '';
  try {
    if (button) {
      button.disabled = true;
      button.textContent = WAIT_SIGN_TEXT;
    }
    addLog(`Chuẩn bị gửi giao dịch ${label}...`, 'info');
    const tx = await build(signer);
    addLog(`Giao dịch ${label} đã được phát đi! TX Hash: ${tx.hash}`, 'info');
    if (NET.explorer) addLog(`Xem trên trình duyệt khối: ${NET.explorer}/tx/${tx.hash}`, 'info');
    if (button) button.textContent = WAIT_MINED_TEXT;

    // Chờ giao dịch được đóng gói vào block (Sepolia mất khoảng 12-30 giây)
    const receipt = await tx.wait();
    addLog(`✅ ${successMessage || `Giao dịch ${label} thành công`} · Block #${receipt.blockNumber} · Gas: ${receipt.gasUsed} · Phí: ${formatEth(receipt.fee)}`, 'success', true);
    await updateWalletInfo();
    return receipt;
  } catch (error) {
    handleTxError(error);
    return null;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = idleText;
    }
  }
}

// 1. Connect MetaMask Wallet
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    addLog('Không tìm thấy tiện ích MetaMask! Vui lòng cài đặt MetaMask trên trình duyệt.', 'error');
    alert('Không tìm thấy MetaMask. Vui lòng cài đặt MetaMask extension!');
    return;
  }

  try {
    addLog('Đang yêu cầu kết nối ví MetaMask...', 'info');

    // Khởi tạo Ethers Provider v6
    provider = new ethers.BrowserProvider(window.ethereum);

    // Yêu cầu quyền truy cập tài khoản
    const accounts = await provider.send("eth_requestAccounts", []);
    userAccount = accounts[0];
    signer = await provider.getSigner();

    // Lấy thông tin mạng & số dư
    await updateWalletInfo();

    connectBtnText.textContent = shortAddr(userAccount);
    onboardCard.hidden = true;
    addLog(`Đã kết nối thành công với ví: ${userAccount}`, 'success', true);

    // Dữ liệu đã được đọc sẵn khi mở trang; các module vẽ lại theo ví vừa kết nối
    // (nút Sửa/Xóa cho bài của mình, nhãn "(bạn)", nút Thu hồi tài liệu, quyền quản trị...)
    runModuleHook('onWalletChanged');

  } catch (error) {
    console.error(error);
    addLog(`Lỗi kết nối ví: ${error.message || error}`, 'error');
  }
}

// 2. Update Wallet & Network Info
async function updateWalletInfo() {
  if (!provider || !userAccount) return;

  try {
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(userAccount);
    const ethBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);

    const chainIdNow = Number(network.chainId);
    const rightNetwork = chainIdNow === NET.chainId;
    networkStatusDot.className = `status-dot ${rightNetwork ? 'online' : 'offline'}`;
    switchNetworkBtn.hidden = rightNetwork; // nút đổi mạng chỉ hiện khi MetaMask đang ở sai mạng
    if (!rightNetwork) {
      networkNameEl.textContent = `Sai mạng (Chain ID ${chainIdNow})`;
      addLog(`MetaMask đang ở Chain ID ${chainIdNow}, không phải ${NET.label} (${NET.chainId}). Bấm "Chuyển sang ${NET.label}" trước khi dùng.`, 'error');
    } else {
      networkNameEl.textContent = NET.label;
    }
    walletAddressEl.textContent = `${userAccount.slice(0, 8)}...${userAccount.slice(-6)}`;
    walletBalanceEl.textContent = `${ethBalance} ETH`;

  } catch (err) {
    console.error("Lỗi khi cập nhật thông tin ví:", err);
  }
}


const blockTimeCache = new Map();

async function getBlockTime(blockNumber) {
  if (blockTimeCache.has(blockNumber)) return blockTimeCache.get(blockNumber);
  const b = await readProvider.getBlock(blockNumber);
  const t = b ? Number(b.timestamp) : 0;
  blockTimeCache.set(blockNumber, t);
  return t;
}

function shortHash(h) {
  return `${h.slice(0, 10)}...${h.slice(-6)}`;
}

function copyText(text, label) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => addLog(`Đã sao chép ${label}: ${text}`, 'success'))
      .catch(() => addLog(`${label}: ${text}`, 'info'));
  } else {
    addLog(`${label}: ${text}`, 'info');
  }
}

// Mã giao dịch bấm vào để sao chép
function hashSpan(hash) {
  const el = document.createElement('span');
  el.className = 'hash-chip mono';
  el.textContent = shortHash(hash);
  el.title = `${hash} (bấm để sao chép)`;
  el.addEventListener('click', () => copyText(hash, 'mã giao dịch'));
  return el;
}

function detailField(label, valueNode) {
  const row = document.createElement('div');
  row.className = 'detail-row';
  const l = document.createElement('span');
  l.className = 'detail-label';
  l.textContent = label;
  const v = document.createElement('span');
  v.className = 'detail-value';
  if (typeof valueNode === 'string') v.textContent = valueNode;
  else v.appendChild(valueNode);
  row.append(l, v);
  return row;
}

function handleTxError(error) {
  console.error(error);
  if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
    addLog('Người dùng đã từ chối ký giao dịch trên MetaMask.', 'warn');
  } else {
    addLog(`Giao dịch thất bại: ${errorReason(error)}`, 'error');
  }
}


// Mã giao dịch bấm vào để xem chi tiết ở thẻ Tra cứu (nếu có module tra cứu), không thì sao chép
function txChip(hash) {
  const el = document.createElement('span');
  el.className = 'hash-chip mono';
  el.textContent = shortHash(hash);
  el.title = `${hash} (bấm để xem chi tiết)`;
  el.addEventListener('click', () => {
    if (typeof openTxLookup === 'function') openTxLookup(hash);
    else copyText(hash, 'mã giao dịch');
  });
  return el;
}

// Địa chỉ ví rút gọn, thêm "(bạn)" nếu là ví đang kết nối
function addrLabel(addr) {
  return `${shortAddr(addr)}${isMe(addr) ? ' (bạn)' : ''}`;
}

// Địa chỉ này có phải ví đang kết nối không
function isMe(addr) {
  return Boolean(userAccount && addr && addr.toLowerCase() === userAccount.toLowerCase());
}

// Sắp xếp sự kiện mới nhất trước (theo block, rồi theo thứ tự trong block)
function newestFirst(a, b) {
  return (b.blockNumber - a.blockNumber) || ((b.index ?? 0) - (a.index ?? 0));
}

// ---------- Theo dõi sự kiện mới ----------
// Thay cho contract.on(...): cứ POLL_MS lại hỏi RPC công khai xem có block mới không; nếu có thì mỗi module
// đọc sự kiện của mình trong các block đó (móc poll) và cập nhật giao diện.
const POLL_MS = 15000;
const MAX_POLL_FAILURES = 3; // lỗi liên tiếp chừng này lần (~45 giây) thì đổi sang nguồn RPC dự phòng
let watchedBlock = null;
let pollFailures = 0;
let polling = false;

async function pollNewEvents() {
  if (polling) return; // lần hỏi trước chưa xong (RPC chậm) thì bỏ qua lần này
  polling = true;
  try {
    const latest = await withTimeout(readProvider.getBlockNumber(), RPC_TIMEOUT_MS);
    if (watchedBlock === null || latest <= watchedBlock) {
      watchedBlock = Math.max(watchedBlock ?? latest, latest);
      pollFailures = 0;
      return;
    }
    const from = Math.max(watchedBlock + 1, latest - LOG_CHUNK); // tab ngủ lâu thì chỉ đọc đoạn gần nhất
    // Không bắt lỗi từng module ở đây: một module lỗi thì cả lượt coi như lỗi, lần sau đọc lại khoảng block này
    await Promise.all(MODULES.filter((m) => typeof m.poll === 'function').map((m) => m.poll(from, latest)));
    watchedBlock = latest; // chỉ đánh dấu đã đọc khi mọi truy vấn thành công
    pollFailures = 0;
  } catch (error) {
    console.warn('Không đọc được sự kiện mới', error);
    pollFailures += 1;
    if (pollFailures >= MAX_POLL_FAILURES) {
      pollFailures = 0;
      addLog(`Nguồn dữ liệu ${new URL(readRpcUrl).host} đang lỗi, chuyển sang nguồn dự phòng...`, 'info');
      try {
        await reconnectReadProvider();
      } catch (e) {
        addLog(`Không kết nối lại được nguồn dữ liệu blockchain: ${e.message || e}`, 'error');
      }
    }
  } finally {
    polling = false;
  }
}

// Ghi sự kiện mới vào nhật ký, dạng "⚡ [Event Tên] mô tả"
function logEvent(e, text) {
  addLog(`⚡ [Event ${e.eventName}] ${text}`, 'success');
}

// Chân trang: link tới mã nguồn đã xác minh của mọi contract trong contracts.json (Sourcify; không có thì trình duyệt khối)
function renderContractLinks() {
  const box = document.getElementById('contractLinks');
  box.textContent = '';
  const list = Object.entries(DEPLOYED).filter(([, d]) => d && d.address);
  list.forEach(([name, { address }], i) => {
    if (i > 0) box.append(' · ');
    if (NET.sourceViewer || NET.explorer) {
      const a = document.createElement('a');
      a.href = NET.sourceViewer ? NET.sourceViewer + address : `${NET.explorer}/address/${address}#code`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = name;
      a.title = address;
      box.appendChild(a);
    } else {
      box.append(`${name} (${shortAddr(address)})`);
    }
  });
  if (list.length === 0) box.textContent = 'chưa deploy';
}

// ---------- Khởi động (app.js gọi sau khi mọi module đã đăng ký) ----------
function startApp() {
  switchNetworkBtn.querySelector('span').textContent = `Chuyển sang ${NET.label}`;
  document.getElementById('networkSubtitle').textContent = `Mọi bài viết và giao dịch được ghi công khai trên mạng ${NET.label}, không thể sửa lén.`;
  addLog(`Sẵn sàng. DApp dùng mạng ${NET.label} (Chain ID ${NET.chainId}). Xem bài viết và lịch sử không cần ví; muốn đăng bài hoặc chuyển tiền thì bấm "Kết nối ví MetaMask".`, 'info');

  // Mở lại thẻ chức năng lần trước (nếu có)
  let savedTab = null;
  try { savedTab = localStorage.getItem('blogchain-tab'); } catch {}
  if (savedTab && document.querySelector(`.tab[data-tab="${savedTab}"]`)) showTab(savedTab);

  for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => showTab(t.dataset.tab));
  connectWalletBtn.addEventListener('click', connectWallet);
  switchNetworkBtn.addEventListener('click', switchNetwork);
  clearLogsBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '<div class="log-entry log-info">[Hệ thống] Nhật ký đã được xóa.</div>';
  });

  // Bản cũ cho phép lưu khóa Pinata trong trình duyệt; chức năng đã bỏ nên xóa khóa đó đi (nếu có)
  try { localStorage.removeItem('blogchain-pinata-jwt'); } catch {}

  // MetaMask: đổi tài khoản thì các module vẽ lại theo ví mới; đổi mạng thì tải lại trang
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts.length === 0) {
        location.reload();
        return;
      }
      if (!provider) return; // chưa bấm "Kết nối ví" trên trang này thì bỏ qua
      userAccount = accounts[0];
      // Signer phải đổi theo tài khoản mới, nếu không giao dịch vẫn ký bằng ví cũ
      signer = await provider.getSigner();
      connectBtnText.textContent = shortAddr(userAccount);
      updateWalletInfo();
      addLog(`Chuyển sang tài khoản ví: ${userAccount}`, 'info');
      runModuleHook('onWalletChanged');
    });
    window.ethereum.on('chainChanged', () => window.location.reload());
  }

  // Mở trang là đọc dữ liệu ngay qua RPC công khai, chưa cần kết nối ví
  (async () => {
    try {
      await Promise.all([loadContractsConfig(), connectReadProvider()]);
    } catch (error) {
      console.error(error);
      addLog(`Không khởi động được DApp: ${error.message || error}. Hãy tải lại trang.`, 'error');
      return;
    }
    renderContractLinks();
    // Các module nạp contract cùng lúc thay vì lần lượt (RPC công khai chậm, nạp lần lượt mất ~8 giây)
    await runModuleHook('init');
    setInterval(pollNewEvents, POLL_MS);
  })();
}

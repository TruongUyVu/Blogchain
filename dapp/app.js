// ABI và địa chỉ của các contract được nạp từ contracts.json (xem loadContractsConfig).
// File này do lệnh "npm run export" trong blogchain-truffle tạo ra từ kết quả biên dịch của Truffle,
// nên sau mỗi lần deploy không phải chép tay ABI / địa chỉ vào đây nữa.
let CONTRACT_ABI = null; // BlogChain
let PAYMENTS_ABI = null; // Payments
let DOCS_ABI = null; // DocumentRegistry

// State Variables
let provider = null;
let signer = null;
let contract = null;
let payments = null; // contract Payments (chuyển tiền)
let docs = null; // contract DocumentRegistry (xác thực tài liệu)
let currentDoc = null; // tài liệu đang kiểm tra: { hash, name, size }
let userAccount = null;
let editingPostId = null; // null = đang đăng bài mới, số = đang sửa bài có id đó

// DOM Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const connectBtnText = document.getElementById('connectBtnText');
const networkStatusDot = document.getElementById('networkStatusDot');
const networkNameEl = document.getElementById('networkName');
const walletAddressEl = document.getElementById('walletAddress');
const walletBalanceEl = document.getElementById('walletBalance');

const contractAddressInput = document.getElementById('contractAddressInput');
const loadContractBtn = document.getElementById('loadContractBtn');
const contractStatusBox = document.getElementById('contractStatusBox');
const contractStatusText = document.getElementById('contractStatusText');

const postCountDisplay = document.getElementById('postCountDisplay');
const postsList = document.getElementById('postsList');
const refreshPostsBtn = document.getElementById('refreshPostsBtn');

const writeModeLabel = document.getElementById('writeModeLabel');
const postTitleInput = document.getElementById('postTitleInput');
const postContentInput = document.getElementById('postContentInput');
const submitPostBtn = document.getElementById('submitPostBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const logsContainer = document.getElementById('logsContainer');
const clearLogsBtn = document.getElementById('clearLogsBtn');

const showDeletedChk = document.getElementById('showDeletedChk');
const historyList = document.getElementById('historyList');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const detailModal = document.getElementById('detailModal');
const detailTitle = document.getElementById('detailTitle');
const detailBody = document.getElementById('detailBody');
const detailCloseBtn = document.getElementById('detailCloseBtn');

const transferToInput = document.getElementById('transferToInput');
const transferAmountInput = document.getElementById('transferAmountInput');
const transferNoteInput = document.getElementById('transferNoteInput');
const sendTransferBtn = document.getElementById('sendTransferBtn');
const transfersList = document.getElementById('transfersList');
const myTransfersChk = document.getElementById('myTransfersChk');
const refreshTransfersBtn = document.getElementById('refreshTransfersBtn');
const txLookupInput = document.getElementById('txLookupInput');
const txLookupBtn = document.getElementById('txLookupBtn');
const txLookupResult = document.getElementById('txLookupResult');

const postImageDrop = document.getElementById('postImageDrop');
const postImageInput = document.getElementById('postImageInput');
const postImagePreview = document.getElementById('postImagePreview');
const postImagePreviewImg = document.getElementById('postImagePreviewImg');
const postImageInfo = document.getElementById('postImageInfo');
const postImageRemoveBtn = document.getElementById('postImageRemoveBtn');
const postImageCidInput = document.getElementById('postImageCidInput');
const pinataJwtInput = document.getElementById('pinataJwtInput');
const pinataRememberChk = document.getElementById('pinataRememberChk');
const pinataClearBtn = document.getElementById('pinataClearBtn');

const docDropzone = document.getElementById('docDropzone');
const docFileInput = document.getElementById('docFileInput');
const docFileLabel = document.getElementById('docFileLabel');
const docHashInput = document.getElementById('docHashInput');
const docCheckHashBtn = document.getElementById('docCheckHashBtn');
const docResult = document.getElementById('docResult');
const docRegisterBox = document.getElementById('docRegisterBox');
const docTitleInput = document.getElementById('docTitleInput');
const docRegisterBtn = document.getElementById('docRegisterBtn');
const docRevokeBtn = document.getElementById('docRevokeBtn');
const docsList = document.getElementById('docsList');
const refreshDocsBtn = document.getElementById('refreshDocsBtn');

const switchNetworkBtn = document.getElementById('switchNetworkBtn');
const onboardCard = document.getElementById('onboardCard');
const toastArea = document.getElementById('toastArea');

const SUBMIT_TEXT_CREATE = 'Đăng bài';
const TRANSFER_TEXT = 'Chuyển tiền';
const SUBMIT_TEXT_EDIT = 'Lưu chỉnh sửa';
const WAIT_SIGN_TEXT = 'Đang chờ ký trong MetaMask...';
const WAIT_MINED_TEXT = 'Đang chờ xác nhận trên blockchain...';

// Các mạng DApp hỗ trợ.
//  - artifactNetworkId: id mạng mà Truffle ghi trong build/contracts (khóa "networks" của contracts.json).
//  - Địa chỉ contract (contractAddress, paymentsAddress, docsAddress) và số block lúc deploy (…DeployBlock)
//    được điền từ contracts.json khi mở trang; để trống nghĩa là contract chưa deploy trên mạng đó.
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    artifactNetworkId: '11155111',
    label: 'Sepolia Testnet',
    contractAddress: '',
    deployBlock: 0,
    paymentsAddress: '',
    paymentsDeployBlock: 0,
    docsAddress: '',
    docsDeployBlock: 0,
    priorityFeeGwei: '0.05', // tip trả cho validator, xem feeOverrides()
    readRpc: 'https://ethereum-sepolia-rpc.publicnode.com', // RPC công khai để ai cũng đọc được, không cần ví
    explorer: 'https://sepolia.etherscan.io',
    params: {
      chainId: '0xaa36a7',
      chainName: 'Sepolia',
      rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['https://sepolia.etherscan.io']
    }
  },
  ganache: {
    chainId: 1337,
    artifactNetworkId: '5777', // Ganache GUI
    label: 'Ganache Local',
    contractAddress: '',
    deployBlock: 0,
    paymentsAddress: '',
    paymentsDeployBlock: 0,
    docsAddress: '',
    docsDeployBlock: 0,
    priorityFeeGwei: null, // Ganache: để MetaMask tự chọn phí
    readRpc: 'http://127.0.0.1:7545',
    explorer: null,
    params: {
      chainId: '0x539',
      chainName: 'Ganache Local',
      rpcUrls: ['http://127.0.0.1:7545'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
    }
  }
};

// Mạng đang dùng. Chạy thử trên máy với Ganache thì đổi thành NETWORKS.ganache
const NET = NETWORKS.sepolia;

// Nạp ABI + địa chỉ contract từ contracts.json (do "npm run export" tạo ra) và điền vào NET
const CONTRACTS_JSON_URL = 'contracts.json?v=1';

async function loadContractsConfig() {
  const res = await fetch(CONTRACTS_JSON_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`không tải được contracts.json (HTTP ${res.status})`);
  const cfg = await res.json();
  CONTRACT_ABI = cfg.abi.BlogChain;
  PAYMENTS_ABI = cfg.abi.Payments;
  DOCS_ABI = cfg.abi.DocumentRegistry;
  const deployed = cfg.networks[NET.artifactNetworkId] || {};
  if (deployed.BlogChain) Object.assign(NET, { contractAddress: deployed.BlogChain.address, deployBlock: deployed.BlogChain.deployBlock });
  if (deployed.Payments) Object.assign(NET, { paymentsAddress: deployed.Payments.address, paymentsDeployBlock: deployed.Payments.deployBlock });
  if (deployed.DocumentRegistry) Object.assign(NET, { docsAddress: deployed.DocumentRegistry.address, docsDeployBlock: deployed.DocumentRegistry.deployBlock });
}

// Provider chỉ để ĐỌC dữ liệu qua RPC công khai: ai mở trang cũng xem được bài viết và lịch sử, không cần MetaMask.
// Ghi dữ liệu (đăng bài, chuyển tiền) vẫn phải ký bằng ví qua `signer`.
let readProvider = new ethers.JsonRpcProvider(NET.readRpc, NET.chainId, { staticNetwork: true });

// RPC công khai chỉ cho đọc sự kiện tối đa 50.000 block mỗi lần → chia khoảng block thành từng đoạn
const LOG_CHUNK = 45000;
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

  // Gợi ý nguyên nhân thường gặp bằng tiếng Việt
  const all = `${text} ${JSON.stringify(error.error || {})}`.toLowerCase();
  let hint = '';
  if (all.includes('nonce')) hint = ' → GỢI Ý: MetaMask lệch nonce (hay gặp sau khi Ganache khởi động lại). Vào MetaMask > Settings > Advanced > Clear activity tab data.';
  else if (all.includes('insufficient funds') || all.includes("doesn't have enough funds")) hint = ' → GỢI Ý: tài khoản đang chọn không đủ ETH để trả phí gas. Trên Sepolia, xin ETH miễn phí ở một "Sepolia faucet".';
  else if (all.includes('only the author')) hint = ' → GỢI Ý: tài khoản đang chọn không phải tác giả của bài này.';
  else if (all.includes('post is deleted')) hint = ' → GỢI Ý: bài viết này đã bị xóa.';
  else if (all.includes('revert')) hint = ' → GỢI Ý: hợp đồng từ chối giao dịch (kiểm tra quyền tác giả, độ dài tiêu đề/nội dung).';
  return text + hint;
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

    // Dữ liệu đã được đọc sẵn khi mở trang; vẽ lại để hiện nút Sửa/Xóa cho bài của mình và nhãn "(bạn)"
    if (contract) loadPosts();
    if (payments) loadTransfers();
    if (docs) loadDocuments();
    if (currentDoc) checkDocument(); // hiện nút Thu hồi nếu mình là người đăng ký

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

// 3. Load Smart Contract by Address
async function loadContract() {
  const address = contractAddressInput.value.trim();

  if (!ethers.isAddress(address)) {
    addLog('Địa chỉ Contract không hợp lệ! Hãy kiểm tra lại định dạng (0x...).', 'warn');
    alert('Địa chỉ Contract không đúng định dạng (0x...)');
    return;
  }

  try {
    addLog(`Đang kết nối tới Contract tại: ${address}...`, 'info');

    // Kiểm tra địa chỉ có thực sự chứa contract trên mạng của DApp không (hay gặp khi Ganache bị reset)
    const code = await readProvider.getCode(address);
    if (code === '0x') {
      addLog(`Không có contract nào ở địa chỉ này trên mạng ${NET.label}. Hãy kiểm tra lại địa chỉ (sau mỗi lần truffle migrate).`, 'error');
      return;
    }

    // Contract gắn với readProvider để đọc; khi gửi giao dịch thì dùng contract.connect(signer)
    contract = new ethers.Contract(address, CONTRACT_ABI, readProvider);
    blockTimeCache.clear();

    contractStatusBox.className = 'contract-status-box active';
    contractStatusText.innerHTML = `✅ Đã kết nối Contract: <strong>${address.slice(0, 10)}...${address.slice(-6)}</strong>`;
    addLog(`Đã nạp Contract BlogChain thành công!`, 'success');

    // Tự động đọc danh sách bài lần đầu (sự kiện mới được theo dõi bởi pollNewEvents)
    await loadPosts();

  } catch (error) {
    console.error(error);
    addLog(`Không thể kết nối Contract: ${error.message}`, 'error');
  }
}

// 4. Đọc danh sách bài viết (No Gas)
async function loadPosts() {
  if (!contract) {
    addLog('Chưa nạp được contract BlogChain. Hãy kiểm tra địa chỉ trong mục "Cài đặt nâng cao".', 'warn');
    return;
  }

  try {
    addLog('Đang gọi getPostCount() và getPost() từ Blockchain...', 'info');
    const count = Number(await contract.getPostCount());

    // Đọc mọi bài cùng lúc (mới nhất trước); ethers tự gộp các lệnh gọi thành ít yêu cầu RPC
    const all = await Promise.all(Array.from({ length: count }, (_, k) => contract.getPost(count - 1 - k)));

    const live = all.filter((p) => !p.deleted);
    const shown = showDeletedChk.checked ? all : live; // bài xóa mềm chỉ hiện khi tick ô

    postCountDisplay.textContent = `${live.length} bài đang hiển thị (tổng đã đăng: ${count}, đã xóa mềm: ${count - live.length})`;
    renderPosts(shown);
    addLog(`Đọc thành công ${shown.length} bài viết từ Smart Contract.`, 'success');

    loadHistory(); // cập nhật bảng lịch sử giao dịch (không chờ)
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc dữ liệu từ Contract: ${errorReason(error)}`, 'error');
  }
}

// Hiển thị danh sách bài (dùng textContent để không chèn HTML từ nội dung bài)
function renderPosts(posts) {
  postsList.innerHTML = '';

  if (posts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'display-content';
    empty.textContent = 'Chưa có bài viết nào.';
    postsList.appendChild(empty);
    return;
  }

  for (const p of posts) {
    const card = document.createElement('div');
    card.className = 'display-box post-card' + (p.deleted ? ' post-deleted' : '');

    const title = document.createElement('div');
    title.className = 'post-title';
    title.textContent = `#${p.id} · ${p.title}`;
    if (p.deleted) {
      const badge = document.createElement('span');
      badge.className = 'badge-deleted';
      badge.textContent = 'ĐÃ XÓA MỀM';
      title.appendChild(badge);
    }

    const meta = document.createElement('div');
    meta.className = 'display-label';
    const edited = p.updatedAt !== p.createdAt ? ` · sửa lúc ${formatTime(p.updatedAt)}` : '';
    meta.textContent = `${shortAddr(p.author)} · ${formatTime(p.createdAt)}${edited}`;

    const { text, cid } = splitImage(p.content);
    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = text;

    card.append(title, meta);
    if (cid) card.appendChild(ipfsImage(cid, `Ảnh minh họa: ${p.title}`));
    card.append(content);

    const actions = document.createElement('div');
    actions.className = 'post-actions';

    const detailBtn = document.createElement('button');
    detailBtn.className = 'btn btn-outline';
    detailBtn.textContent = '🔍 Chi tiết';
    detailBtn.addEventListener('click', () => openPostDetail(p));
    actions.appendChild(detailBtn);

    // Chỉ tác giả mới thấy nút Sửa / Xóa, và chỉ với bài chưa xóa (contract cũng kiểm tra lại bằng onlyAuthor)
    if (!p.deleted && userAccount && p.author.toLowerCase() === userAccount.toLowerCase()) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-outline';
      editBtn.textContent = '✏️ Sửa';
      editBtn.addEventListener('click', () => startEdit(p));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-outline';
      deleteBtn.textContent = '🗑️ Xóa';
      deleteBtn.addEventListener('click', () => deletePost(p.id));

      actions.append(editBtn, deleteBtn);
    }

    card.appendChild(actions);
    postsList.appendChild(card);
  }
}

// ---------- Chi tiết bài viết & lịch sử giao dịch ----------

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

// Đọc lại tiêu đề + nội dung đã gửi trong một giao dịch (dữ liệu vẫn nằm trong lịch sử chuỗi)
async function readTxContent(hash) {
  try {
    const tx = await readProvider.getTransaction(hash);
    const parsed = contract.interface.parseTransaction({ data: tx.data });
    if (!parsed) return null;
    const a = parsed.args;
    if (parsed.name === 'createPost') return { title: a[0], content: a[1] };
    if (parsed.name === 'editPost') return { title: a[1], content: a[2] };
  } catch (e) {
    console.warn('Không giải mã được giao dịch', hash, e);
  }
  return null;
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

function versionBlock(heading, ev, when, content) {
  const box = document.createElement('div');
  box.className = 'version-box';
  const h = document.createElement('div');
  h.className = 'version-head';
  h.append(document.createTextNode(`${heading} · ${formatTime(when)} · khối #${ev.blockNumber} · bởi ${shortAddr(ev.args.author)} · `));
  h.appendChild(hashSpan(ev.transactionHash));
  box.appendChild(h);
  const body = document.createElement('div');
  body.className = 'version-body';
  if (content) {
    const t = document.createElement('div');
    t.className = 'post-title';
    t.textContent = content.title;
    const { text, cid } = splitImage(content.content);
    const c = document.createElement('div');
    c.className = 'post-content';
    c.textContent = text;
    body.append(t);
    if (cid) body.appendChild(ipfsImage(cid, `Ảnh minh họa: ${content.title}`));
    body.append(c);
  } else {
    body.textContent = '(Không đọc lại được nội dung của giao dịch này)';
  }
  box.appendChild(body);
  return box;
}

async function openPostDetail(p) {
  detailBody.innerHTML = '';
  detailTitle.textContent = `#${p.id} · ${p.title}`;
  detailModal.classList.add('open');

  const loading = document.createElement('div');
  loading.className = 'display-content';
  loading.textContent = 'Đang đọc lịch sử từ blockchain...';
  detailBody.appendChild(loading);

  try {
    const id = BigInt(p.id);
    const [created, edited, deleted] = await Promise.all([
      queryLogs(contract, contract.filters.PostCreated(id), NET.deployBlock),
      queryLogs(contract, contract.filters.PostEdited(id), NET.deployBlock),
      queryLogs(contract, contract.filters.PostDeleted(id), NET.deployBlock),
    ]);

    detailBody.innerHTML = '';

    detailBody.appendChild(detailField('Mã bài (id)', String(p.id)));
    const full = document.createElement('span');
    full.className = 'mono';
    full.textContent = p.author;
    detailBody.appendChild(detailField('Tác giả (địa chỉ ví)', full));
    detailBody.appendChild(detailField('Đăng lúc', formatTime(p.createdAt)));
    detailBody.appendChild(detailField('Sửa lần cuối', p.updatedAt !== p.createdAt ? formatTime(p.updatedAt) : 'Chưa sửa'));
    detailBody.appendChild(detailField('Trạng thái', p.deleted ? 'Đã xóa mềm (dữ liệu vẫn nằm trên chuỗi)' : 'Đang hiển thị'));
    detailBody.appendChild(detailField('Số lần sửa', String(edited.length)));

    const h = document.createElement('div');
    h.className = 'detail-section';
    h.textContent = 'Nội dung hiện tại';
    detailBody.appendChild(h);
    const current = splitImage(p.content);
    if (current.cid) detailBody.appendChild(ipfsImage(current.cid, `Ảnh minh họa: ${p.title}`));
    const cur = document.createElement('div');
    cur.className = 'post-content';
    cur.textContent = current.text;
    detailBody.appendChild(cur);
    if (current.cid) detailBody.appendChild(detailField('Ảnh trên IPFS (CID)', current.cid));

    const h2 = document.createElement('div');
    h2.className = 'detail-section';
    h2.textContent = 'Lịch sử các phiên bản (đọc từ giao dịch trên chuỗi)';
    detailBody.appendChild(h2);

    for (const ev of created) {
      const content = await readTxContent(ev.transactionHash);
      detailBody.appendChild(versionBlock('Bản gốc (đăng bài)', ev, Number(ev.args.createdAt), content));
    }
    let k = 1;
    for (const ev of edited) {
      const content = await readTxContent(ev.transactionHash);
      detailBody.appendChild(versionBlock(`Sửa lần ${k}`, ev, Number(ev.args.updatedAt), content));
      k++;
    }
    for (const ev of deleted) {
      const t = await getBlockTime(ev.blockNumber);
      const box = document.createElement('div');
      box.className = 'version-box';
      const hd = document.createElement('div');
      hd.className = 'version-head';
      hd.append(document.createTextNode(`Xóa mềm · ${formatTime(t)} · khối #${ev.blockNumber} · bởi ${shortAddr(ev.args.author)} · `));
      hd.appendChild(hashSpan(ev.transactionHash));
      box.appendChild(hd);
      detailBody.appendChild(box);
    }
  } catch (error) {
    console.error(error);
    detailBody.innerHTML = '';
    const err = document.createElement('div');
    err.className = 'display-content';
    err.textContent = `Không đọc được lịch sử: ${errorReason(error)}`;
    detailBody.appendChild(err);
  }
}

function closeDetail() {
  detailModal.classList.remove('open');
}

// Bảng lịch sử mọi giao dịch của blog (đăng, sửa, xóa) lấy từ sự kiện trên chuỗi
async function loadHistory() {
  if (!contract) return;
  try {
    const [created, edited, deleted] = await Promise.all([
      queryLogs(contract, contract.filters.PostCreated(), NET.deployBlock),
      queryLogs(contract, contract.filters.PostEdited(), NET.deployBlock),
      queryLogs(contract, contract.filters.PostDeleted(), NET.deployBlock),
    ]);

    const rows = [
      ...created.map((e) => ({ type: 'Đăng bài', ev: e, when: Number(e.args.createdAt) })),
      ...edited.map((e) => ({ type: 'Sửa bài', ev: e, when: Number(e.args.updatedAt) })),
      ...deleted.map((e) => ({ type: 'Xóa mềm', ev: e, when: 0 })),
    ];
    rows.sort((a, b) => (b.ev.blockNumber - a.ev.blockNumber) || ((b.ev.index ?? 0) - (a.ev.index ?? 0)));

    for (const r of rows) {
      if (!r.when) r.when = await getBlockTime(r.ev.blockNumber);
    }

    historyList.innerHTML = '';
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'display-content';
      empty.textContent = 'Chưa có giao dịch nào của blog.';
      historyList.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'history-table';
    const head = document.createElement('tr');
    for (const t of ['Loại', 'Bài', 'Người thực hiện', 'Thời gian', 'Khối', 'Mã giao dịch']) {
      const th = document.createElement('th');
      th.textContent = t;
      head.appendChild(th);
    }
    table.appendChild(head);

    for (const r of rows.slice(0, 100)) {
      const tr = document.createElement('tr');
      const cells = [r.type, `#${r.ev.args.id}`, shortAddr(r.ev.args.author), formatTime(r.when), `#${r.ev.blockNumber}`];
      for (const c of cells) {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      }
      const tdHash = document.createElement('td');
      tdHash.appendChild(hashSpan(r.ev.transactionHash));
      tr.appendChild(tdHash);
      table.appendChild(tr);
    }
    historyList.appendChild(table);
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc lịch sử giao dịch: ${errorReason(error)}`, 'error');
  }
}

// ---------- Ảnh minh họa qua IPFS ----------
// Ảnh nằm trên IPFS; bài viết chỉ lưu thêm một dòng "[img:ipfs://<CID>]" ở cuối nội dung.
// Nhờ vậy không phải sửa / deploy lại contract BlogChain và các bài cũ vẫn giữ nguyên.

const IPFS_GATEWAYS = ['https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/'];
const IMG_MARKER_RE = /\n*\[img:ipfs:\/\/([A-Za-z0-9]+)\]\s*$/;
const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/;
const MAX_IMAGE_INPUT = 15 * 1024 * 1024;
const MAX_GIF_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const PINATA_UPLOAD_URL = 'https://uploads.pinata.cloud/v3/files';
const PINATA_JWT_KEY = 'blogchain-pinata-jwt';

let postImage = null; // ảnh sẽ đăng kèm bài: { file, previewUrl, cid } (file = null nếu ảnh đã có sẵn trên IPFS)

// Tách nội dung bài thành phần chữ và CID ảnh (nếu có)
function splitImage(content) {
  const m = content.match(IMG_MARKER_RE);
  return m ? { text: content.slice(0, m.index), cid: m[1] } : { text: content, cid: null };
}

function withImage(text, cid) {
  return cid ? `${text}\n\n[img:ipfs://${cid}]` : text;
}

// Lấy CID từ những gì người dùng dán: CID trần, ipfs://CID, hoặc link cổng .../ipfs/CID
function parseCid(input) {
  const s = input.trim();
  const m = s.match(/^ipfs:\/\/([A-Za-z0-9]+)/) || s.match(/\/ipfs\/([A-Za-z0-9]+)/) || s.match(/^https?:\/\/([a-z2-7]+)\.ipfs\./);
  const cid = m ? m[1] : s;
  return CID_RE.test(cid) ? cid : null;
}

// Thẻ <img> đọc ảnh qua cổng IPFS; cổng này lỗi thì tự thử cổng tiếp theo
function ipfsImage(cid, alt) {
  const img = document.createElement('img');
  img.className = 'post-image';
  img.alt = alt;
  img.loading = 'lazy';
  let gw = 0;
  img.src = IPFS_GATEWAYS[gw] + cid;
  img.addEventListener('error', () => {
    gw += 1;
    if (gw < IPFS_GATEWAYS.length) {
      img.src = IPFS_GATEWAYS[gw] + cid;
      return;
    }
    const box = document.createElement('div');
    box.className = 'post-image-failed';
    box.append('Chưa tải được ảnh từ IPFS (ảnh mới đăng có thể cần vài phút). ');
    const a = document.createElement('a');
    a.href = IPFS_GATEWAYS[0] + cid;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Mở ảnh';
    box.appendChild(a);
    img.replaceWith(box);
  });
  img.addEventListener('click', () => window.open(img.src, '_blank', 'noopener'));
  return img;
}

// Thu nhỏ ảnh (cạnh dài tối đa 1600px) và lưu lại dạng JPEG. Lưu lại qua canvas cũng xóa
// thông tin ẩn trong ảnh (EXIF), kể cả vị trí GPS của ảnh chụp bằng điện thoại.
async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('File đã chọn không phải là ảnh.');
  if (file.size > MAX_IMAGE_INPUT) throw new Error(`Ảnh quá lớn (${formatBytes(file.size)}). Hãy chọn ảnh dưới 15 MB.`);
  if (file.type === 'image/gif') { // giữ nguyên ảnh động
    if (file.size > MAX_GIF_BYTES) throw new Error('Ảnh GIF tối đa 3 MB.');
    return file;
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // ảnh PNG nền trong suốt → nền trắng thay vì đen
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

function clearPostImage() {
  if (postImage && postImage.previewUrl) URL.revokeObjectURL(postImage.previewUrl);
  postImage = null;
  postImagePreview.hidden = true;
  postImagePreviewImg.removeAttribute('src');
  postImageInfo.textContent = '';
}

// Người dùng chọn / kéo thả ảnh từ máy: chuẩn bị ảnh và xem trước (chưa tải lên đâu cả)
async function selectPostImage(file) {
  if (!file) return;
  try {
    const prepared = await prepareImage(file);
    clearPostImage();
    postImage = { file: prepared, previewUrl: URL.createObjectURL(prepared), cid: null };
    postImagePreviewImg.src = postImage.previewUrl;
    postImageInfo.textContent = `${prepared.name} · ${formatBytes(prepared.size)} · đã thu nhỏ và xóa thông tin vị trí`;
    postImagePreview.hidden = false;
    postImageCidInput.value = '';
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    postImageInput.value = ''; // cho phép chọn lại đúng ảnh đó lần nữa
  }
}

// Xem trước ảnh đã có trên IPFS (khi dán CID hoặc khi sửa bài có ảnh)
function showCidPreview(cid) {
  clearPostImage();
  postImage = { file: null, previewUrl: null, cid };
  postImagePreviewImg.src = IPFS_GATEWAYS[0] + cid;
  postImageInfo.textContent = `Ảnh trên IPFS: ${cid.slice(0, 12)}...${cid.slice(-6)}`;
  postImagePreview.hidden = false;
}

function onCidInputChange() {
  const raw = postImageCidInput.value.trim();
  if (!raw) {
    if (postImage && !postImage.file) clearPostImage();
    return;
  }
  const cid = parseCid(raw);
  if (!cid) {
    alert('Mã CID không hợp lệ. Ví dụ đúng: bafy... hoặc Qm..., ipfs://bafy..., https://.../ipfs/bafy...');
    return;
  }
  postImageCidInput.value = cid;
  showCidPreview(cid);
}

// Khóa Pinata (JWT): chỉ giữ trong trình duyệt; chỉ lưu lại khi người dùng tick "Nhớ khóa"
function savePinataPref() {
  try {
    const jwt = pinataJwtInput.value.trim();
    if (pinataRememberChk.checked && jwt) localStorage.setItem(PINATA_JWT_KEY, jwt);
    else localStorage.removeItem(PINATA_JWT_KEY);
  } catch {}
}

// Tải ảnh lên IPFS qua Pinata, trả về CID
async function uploadToPinata(file) {
  const jwt = pinataJwtInput.value.trim();
  if (!jwt) throw new Error('Chưa có khóa Pinata. Mở mục "Cài đặt tải ảnh lên IPFS" để dán khóa, hoặc dán sẵn mã CID của ảnh.');
  const form = new FormData();
  form.append('file', file);
  form.append('network', 'public');
  form.append('name', `blogchain-${file.name}`);
  const res = await fetch(PINATA_UPLOAD_URL, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: form });
  if (res.status === 401 || res.status === 403) throw new Error('Khóa Pinata không hợp lệ, đã hết hạn hoặc không có quyền tải file.');
  if (!res.ok) throw new Error(`Pinata báo lỗi ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const cid = json && json.data && json.data.cid;
  if (!cid) throw new Error('Pinata không trả về mã CID của ảnh.');
  return cid;
}

// Chuyển form sang chế độ sửa bài
function startEdit(post) {
  editingPostId = post.id;
  postTitleInput.value = post.title;
  const { text, cid } = splitImage(post.content);
  postContentInput.value = text;
  postImageCidInput.value = cid || '';
  if (cid) showCidPreview(cid);
  else clearPostImage();
  writeModeLabel.textContent = `editPost(${post.id}, title, content)`;
  submitPostBtn.textContent = SUBMIT_TEXT_EDIT;
  cancelEditBtn.style.display = '';
  postTitleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  postTitleInput.focus({ preventScroll: true });
}

// Quay lại chế độ đăng bài mới
function resetForm() {
  editingPostId = null;
  postTitleInput.value = '';
  postContentInput.value = '';
  postImageCidInput.value = '';
  clearPostImage();
  writeModeLabel.textContent = 'createPost(title, content)';
  submitPostBtn.textContent = SUBMIT_TEXT_CREATE;
  cancelEditBtn.style.display = 'none';
}

// Gửi giao dịch (contract.connect(signer) để luôn ký bằng tài khoản MetaMask hiện tại), chờ mined rồi cập nhật lại giao diện
async function sendTx(label, txPromise) {
  const tx = await txPromise;
  addLog(`Giao dịch ${label} đã được phát đi! TX Hash: ${tx.hash}`, 'info');
  if (NET.explorer) addLog(`Xem trên trình duyệt khối: ${NET.explorer}/tx/${tx.hash}`, 'info');
  submitPostBtn.textContent = WAIT_MINED_TEXT;

  // Chờ giao dịch được đóng gói vào Block (Sepolia mất khoảng 12-30 giây)
  const receipt = await tx.wait();
  addLog(`✅ Giao dịch thành công trong Block #${receipt.blockNumber}! Gas sử dụng: ${receipt.gasUsed.toString()} · Phí: ${ethers.formatEther(receipt.fee)} ETH`, 'success', true);

  // Cập nhật lại số dư ví và dữ liệu
  await updateWalletInfo();
  await loadPosts();
}

function handleTxError(error) {
  console.error(error);
  if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
    addLog('Người dùng đã từ chối ký giao dịch trên MetaMask.', 'warn');
  } else {
    addLog(`Giao dịch thất bại: ${errorReason(error)}`, 'error');
  }
}

// 5. Đăng bài mới / Lưu chỉnh sửa (Requires Gas & MetaMask Sign)
async function submitPost() {
  if (!contract) {
    addLog('Chưa nạp được contract BlogChain. Hãy kiểm tra địa chỉ trong mục "Cài đặt nâng cao".', 'warn');
    return;
  }

  const title = postTitleInput.value.trim();
  const text = postContentInput.value.trim();
  if (!title || !text) {
    alert('Vui lòng nhập đầy đủ tiêu đề và nội dung!');
    return;
  }

  // Mã CID dán tay nhưng chưa bấm ra ngoài ô thì xử lý luôn ở đây
  if (!postImage && postImageCidInput.value.trim()) {
    const cid = parseCid(postImageCidInput.value);
    if (!cid) {
      alert('Mã CID của ảnh không hợp lệ!');
      return;
    }
    postImage = { file: null, previewUrl: null, cid };
  }

  // Giới hạn tính theo byte giống trong contract (tiếng Việt có dấu chiếm nhiều byte hơn 1 ký tự).
  // Có ảnh thì tính cả dòng "[img:ipfs://CID]" (CID dài tối đa khoảng 59 ký tự).
  const encoder = new TextEncoder();
  const contentLimitCheck = withImage(text, postImage ? (postImage.cid || 'b'.repeat(59)) : null);
  if (encoder.encode(title).length > 100 || encoder.encode(contentLimitCheck).length > 2000) {
    alert(`Tiêu đề tối đa 100 byte, nội dung tối đa 2000 byte${postImage ? ' (dòng ảnh chiếm khoảng 75 byte)' : ''}!`);
    return;
  }

  if (!(await ensureWallet())) return;

  try {
    submitPostBtn.disabled = true;

    // Ảnh chọn từ máy: tải lên IPFS trước, lấy CID rồi mới gửi giao dịch
    if (postImage && !postImage.cid) {
      submitPostBtn.textContent = 'Đang tải ảnh lên IPFS...';
      addLog(`Đang tải ảnh "${postImage.file.name}" (${formatBytes(postImage.file.size)}) lên IPFS qua Pinata...`, 'info');
      try {
        postImage.cid = await uploadToPinata(postImage.file);
      } catch (error) {
        console.error(error);
        addLog(`Không tải được ảnh lên IPFS: ${error.message || error}`, 'error');
        return;
      }
      addLog(`Đã tải ảnh lên IPFS. CID: ${postImage.cid}`, 'success');
    }
    const content = withImage(text, postImage ? postImage.cid : null);

    submitPostBtn.textContent = WAIT_SIGN_TEXT;

    if (editingPostId === null) {
      addLog(`Chuẩn bị gửi giao dịch createPost("${title}")...`, 'info');
      const c = contract.connect(signer);
      await sendTx('createPost', c.createPost(title, content, await txOptions(c.createPost, [title, content])));
    } else {
      addLog(`Chuẩn bị gửi giao dịch editPost(${editingPostId}, "${title}")...`, 'info');
      const c = contract.connect(signer);
      await sendTx('editPost', c.editPost(editingPostId, title, content, await txOptions(c.editPost, [editingPostId, title, content])));
    }
    resetForm();

  } catch (error) {
    handleTxError(error);
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = editingPostId === null ? SUBMIT_TEXT_CREATE : SUBMIT_TEXT_EDIT;
  }
}

// 6. Xóa bài (xóa mềm, chỉ tác giả)
async function deletePost(id) {
  if (!confirm(`Xóa bài #${id}? Dữ liệu cũ vẫn còn trong lịch sử blockchain.`)) return;
  if (!(await ensureWallet())) return;

  try {
    submitPostBtn.disabled = true;
    addLog(`Chuẩn bị gửi giao dịch deletePost(${id})...`, 'info');
    const c = contract.connect(signer);
    await sendTx('deletePost', c.deletePost(id, await txOptions(c.deletePost, [id])));
    if (editingPostId !== null && editingPostId === id) resetForm();
  } catch (error) {
    handleTxError(error);
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = editingPostId === null ? SUBMIT_TEXT_CREATE : SUBMIT_TEXT_EDIT;
  }
}

// ---------- Chuyển tiền (contract Payments) & tra cứu giao dịch ----------

// Mã giao dịch bấm vào để xem chi tiết ở ô Tra cứu
function txChip(hash) {
  const el = document.createElement('span');
  el.className = 'hash-chip mono';
  el.textContent = shortHash(hash);
  el.title = `${hash} (bấm để xem chi tiết)`;
  el.addEventListener('click', () => {
    txLookupInput.value = hash;
    showTab('lookup');
    lookupTx();
  });
  return el;
}

// Địa chỉ ví rút gọn, thêm "(bạn)" nếu là ví đang kết nối
function addrLabel(addr) {
  const mine = userAccount && addr.toLowerCase() === userAccount.toLowerCase();
  return `${shortAddr(addr)}${mine ? ' (bạn)' : ''}`;
}

// Nạp contract Payments (gọi khi mở trang, không cần ví)
async function initPayments() {
  if (payments) return;
  if (!NET.paymentsAddress) {
    transfersList.innerHTML = `<div class="display-content">Contract Payments chưa được deploy trên mạng ${NET.label}.</div>`;
    return;
  }
  try {
    const code = await readProvider.getCode(NET.paymentsAddress);
    if (code === '0x') {
      addLog(`Không tìm thấy contract Payments trên mạng ${NET.label}.`, 'error');
      return;
    }
    // Gắn với readProvider để đọc; khi chuyển tiền thì dùng payments.connect(signer)
    payments = new ethers.Contract(NET.paymentsAddress, PAYMENTS_ABI, readProvider);
    addLog('Đã nạp contract Payments (chuyển tiền).', 'success');
    await loadTransfers();
  } catch (error) {
    console.error(error);
    addLog(`Không nạp được contract Payments: ${errorReason(error)}`, 'error');
  }
}

// Theo dõi sự kiện mới trên chuỗi (thay cho contract.on): cứ POLL_MS lại hỏi RPC công khai
// xem có block mới không, nếu có thì đọc sự kiện trong các block đó và cập nhật giao diện.
const POLL_MS = 15000;
let watchedBlock = null;

async function pollNewEvents() {
  try {
    const latest = await readProvider.getBlockNumber();
    if (watchedBlock === null || latest <= watchedBlock) {
      watchedBlock = Math.max(watchedBlock ?? latest, latest);
      return;
    }
    const from = Math.max(watchedBlock + 1, latest - LOG_CHUNK); // tab ngủ lâu thì chỉ đọc đoạn gần nhất
    watchedBlock = latest;

    if (contract) {
      const evs = await contract.queryFilter('*', from, latest);
      for (const e of evs) {
        const a = e.args;
        if (e.eventName === 'PostCreated') addLog(`⚡ [Event PostCreated] Bài #${a.id} "${a.title}" được đăng bởi ${shortAddr(a.author)}`, 'success');
        if (e.eventName === 'PostEdited') addLog(`⚡ [Event PostEdited] Bài #${a.id} được sửa bởi ${shortAddr(a.author)}`, 'success');
        if (e.eventName === 'PostDeleted') addLog(`⚡ [Event PostDeleted] Bài #${a.id} bị xóa bởi ${shortAddr(a.author)}`, 'success');
      }
      if (evs.length) loadPosts();
    }
    if (payments) {
      const evs = await payments.queryFilter(payments.filters.Transferred(), from, latest);
      for (const e of evs) {
        addLog(`⚡ [Event Transferred] ${shortAddr(e.args.from)} → ${shortAddr(e.args.to)}: ${ethers.formatEther(e.args.amount)} ETH`, 'success');
      }
      if (evs.length) loadTransfers();
    }
    if (docs) {
      const evs = await docs.queryFilter('*', from, latest);
      for (const e of evs) {
        if (e.eventName === 'DocumentRegistered') addLog(`⚡ [Event DocumentRegistered] "${e.args.title}" được đăng ký bởi ${shortAddr(e.args.issuer)}`, 'success');
        if (e.eventName === 'DocumentRevoked') addLog(`⚡ [Event DocumentRevoked] Tài liệu ${shortHash(e.args.docHash)} bị thu hồi bởi ${shortAddr(e.args.issuer)}`, 'success');
      }
      if (evs.length) {
        loadDocuments();
        if (currentDoc) checkDocument();
      }
    }
  } catch (error) {
    console.warn('Không đọc được sự kiện mới', error);
  }
}

// Chuyển ETH qua contract Payments (Requires Gas & MetaMask Sign)
async function sendTransfer() {
  if (!payments) {
    addLog(`Chưa nạp được contract Payments trên mạng ${NET.label}.`, 'warn');
    return;
  }
  if (!(await ensureWallet())) return;

  const to = transferToInput.value.trim();
  const amountText = transferAmountInput.value.trim().replace(',', '.');
  const note = transferNoteInput.value.trim();

  if (!ethers.isAddress(to)) {
    alert('Địa chỉ ví người nhận không hợp lệ (0x...)');
    return;
  }
  if (to.toLowerCase() === userAccount.toLowerCase()) {
    alert('Không thể tự chuyển cho chính mình!');
    return;
  }
  let value;
  try {
    value = ethers.parseEther(amountText);
  } catch {
    alert('Số tiền không hợp lệ. Ví dụ: 0.001');
    return;
  }
  if (value <= 0n) {
    alert('Số tiền phải lớn hơn 0!');
    return;
  }
  if (new TextEncoder().encode(note).length > 200) {
    alert('Ghi chú tối đa 200 byte!');
    return;
  }
  if (!confirm(`Chuyển ${ethers.formatEther(value)} ETH tới ${to}?\nGiao dịch trên blockchain không thể hoàn tác.`)) return;

  try {
    sendTransferBtn.disabled = true;
    sendTransferBtn.textContent = WAIT_SIGN_TEXT;
    addLog(`Chuẩn bị gửi giao dịch sendEth(${shortAddr(to)}) kèm ${ethers.formatEther(value)} ETH...`, 'info');

    const p = payments.connect(signer);
    const tx = await p.sendEth(to, note, await txOptions(p.sendEth, [to, note], { value }));
    addLog(`Giao dịch chuyển tiền đã được phát đi! TX Hash: ${tx.hash}`, 'info');
    if (NET.explorer) addLog(`Xem trên trình duyệt khối: ${NET.explorer}/tx/${tx.hash}`, 'info');
    sendTransferBtn.textContent = WAIT_MINED_TEXT;

    const receipt = await tx.wait();
    addLog(`✅ Đã chuyển ${ethers.formatEther(value)} ETH tới ${shortAddr(to)} trong Block #${receipt.blockNumber}! Phí gas: ${ethers.formatEther(receipt.fee)} ETH`, 'success', true);

    transferAmountInput.value = '';
    transferNoteInput.value = '';
    await updateWalletInfo();
    await loadTransfers();
  } catch (error) {
    handleTxError(error);
  } finally {
    sendTransferBtn.disabled = false;
    sendTransferBtn.textContent = TRANSFER_TEXT;
  }
}

// Bảng lịch sử chuyển tiền lấy từ sự kiện Transferred trên chuỗi
async function loadTransfers() {
  if (!payments) return;
  try {
    let events = await queryLogs(payments, payments.filters.Transferred(), NET.paymentsDeployBlock);
    if (myTransfersChk.checked && !userAccount) {
      addLog('Hãy kết nối ví MetaMask để lọc giao dịch của ví bạn.', 'warn');
      myTransfersChk.checked = false;
    }
    if (myTransfersChk.checked && userAccount) {
      const me = userAccount.toLowerCase();
      events = events.filter((e) => e.args.from.toLowerCase() === me || e.args.to.toLowerCase() === me);
    }
    events.sort((a, b) => (b.blockNumber - a.blockNumber) || ((b.index ?? 0) - (a.index ?? 0)));

    transfersList.innerHTML = '';
    if (events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'display-content';
      empty.textContent = myTransfersChk.checked ? 'Ví của bạn chưa có giao dịch chuyển tiền nào.' : 'Chưa có giao dịch chuyển tiền nào.';
      transfersList.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'history-table';
    const head = document.createElement('tr');
    for (const t of ['#', 'Thời gian', 'Người gửi', 'Người nhận', 'Số tiền', 'Ghi chú', 'Mã giao dịch']) {
      const th = document.createElement('th');
      th.textContent = t;
      head.appendChild(th);
    }
    table.appendChild(head);

    for (const e of events.slice(0, 100)) {
      const tr = document.createElement('tr');
      const cells = [
        `#${e.args.id}`,
        formatTime(e.args.sentAt),
        addrLabel(e.args.from),
        addrLabel(e.args.to),
        `${ethers.formatEther(e.args.amount)} ETH`,
        e.args.note || '—',
      ];
      cells.forEach((c, i) => {
        const td = document.createElement('td');
        td.textContent = c;
        if (i === 2) td.title = e.args.from;
        if (i === 3) td.title = e.args.to;
        if (i === 4) td.className = 'amount-cell';
        if (i === 5) td.className = 'note-cell';
        tr.appendChild(td);
      });
      const tdHash = document.createElement('td');
      tdHash.appendChild(txChip(e.transactionHash));
      tr.appendChild(tdHash);
      table.appendChild(tr);
    }
    transfersList.appendChild(table);
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc lịch sử chuyển tiền: ${errorReason(error)}`, 'error');
  }
}

// Tra cứu một giao dịch bất kỳ theo mã (kể cả chuyển ETH trực tiếp bằng MetaMask)
async function lookupTx() {
  const hash = txLookupInput.value.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    alert('Mã giao dịch phải có dạng 0x + 64 ký tự (0-9, a-f).');
    return;
  }

  txLookupResult.innerHTML = '<div class="display-content">Đang tra cứu trên blockchain...</div>';
  try {
    const [tx, receipt] = await Promise.all([readProvider.getTransaction(hash), readProvider.getTransactionReceipt(hash)]);
    txLookupResult.innerHTML = '';
    if (!tx) {
      const nf = document.createElement('div');
      nf.className = 'display-content';
      nf.textContent = `Không tìm thấy giao dịch này trên mạng ${NET.label}.`;
      txLookupResult.appendChild(nf);
      return;
    }

    // Đoán loại giao dịch; nếu đi qua Payments thì lấy người nhận + ghi chú từ dữ liệu gọi hàm
    const target = (tx.to || '').toLowerCase();
    let kind = tx.data && tx.data !== '0x' ? 'Gọi smart contract' : 'Chuyển ETH trực tiếp (ví → ví)';
    let to = tx.to;
    let note = null;
    if (NET.paymentsAddress && target === NET.paymentsAddress.toLowerCase()) {
      kind = 'Chuyển tiền qua contract Payments';
      const parsed = payments ? payments.interface.parseTransaction({ data: tx.data, value: tx.value }) : null;
      if (parsed) {
        to = parsed.args[0];
        note = parsed.args[1];
      }
    } else if (NET.contractAddress && target === NET.contractAddress.toLowerCase()) {
      kind = 'Thao tác blog (BlogChain)';
    } else if (!tx.to) {
      kind = 'Deploy smart contract';
    }

    const status = document.createElement('span');
    if (!receipt) {
      status.textContent = '⏳ Đang chờ xác nhận';
    } else if (receipt.status === 1) {
      status.textContent = '✅ Thành công';
      status.className = 'tx-status-ok';
    } else {
      status.textContent = '❌ Thất bại (bị revert)';
      status.className = 'tx-status-fail';
    }

    const amount = document.createElement('span');
    amount.className = 'amount-cell';
    amount.textContent = `${ethers.formatEther(tx.value)} ETH`;

    const fromEl = document.createElement('span');
    fromEl.className = 'mono';
    fromEl.textContent = tx.from;
    const toEl = document.createElement('span');
    toEl.className = 'mono';
    toEl.textContent = to || '(không có - tạo contract)';

    txLookupResult.appendChild(detailField('Loại', kind));
    txLookupResult.appendChild(detailField('Trạng thái', status));
    txLookupResult.appendChild(detailField('Người gửi', fromEl));
    txLookupResult.appendChild(detailField('Người nhận', toEl));
    txLookupResult.appendChild(detailField('Số tiền', amount));
    if (note !== null) txLookupResult.appendChild(detailField('Ghi chú', note || '—'));
    if (receipt) {
      txLookupResult.appendChild(detailField('Khối', `#${receipt.blockNumber} · ${formatTime(await getBlockTime(receipt.blockNumber))}`));
      txLookupResult.appendChild(detailField('Phí gas', `${ethers.formatEther(receipt.fee)} ETH (${receipt.gasUsed} gas)`));
    }
    if (NET.explorer) {
      const a = document.createElement('a');
      a.href = `${NET.explorer}/tx/${hash}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Mở trên Etherscan ↗';
      txLookupResult.appendChild(detailField('Xem thêm', a));
    }
  } catch (error) {
    console.error(error);
    txLookupResult.innerHTML = '';
    const err = document.createElement('div');
    err.className = 'display-content';
    err.textContent = `Không tra cứu được: ${errorReason(error)}`;
    txLookupResult.appendChild(err);
  }
}

// ---------- Xác thực tài liệu (contract DocumentRegistry) ----------

const MAX_DOC_BYTES = 500 * 1024 * 1024; // file quá lớn thì trình duyệt đọc chậm / hết bộ nhớ

// Nạp contract DocumentRegistry (gọi khi mở trang, không cần ví)
async function initDocs() {
  if (docs) return;
  if (!NET.docsAddress) {
    docsList.innerHTML = `<div class="display-content">Chức năng xác thực tài liệu chưa được deploy trên mạng ${NET.label}.</div>`;
    return;
  }
  try {
    const code = await readProvider.getCode(NET.docsAddress);
    if (code === '0x') {
      addLog(`Không tìm thấy contract DocumentRegistry trên mạng ${NET.label}.`, 'error');
      return;
    }
    // Gắn với readProvider để đọc; khi đăng ký / thu hồi thì dùng docs.connect(signer)
    docs = new ethers.Contract(NET.docsAddress, DOCS_ABI, readProvider);
    addLog('Đã nạp contract DocumentRegistry (xác thực tài liệu).', 'success');
    await loadDocuments();
  } catch (error) {
    console.error(error);
    addLog(`Không nạp được contract DocumentRegistry: ${errorReason(error)}`, 'error');
  }
}

function formatBytes(n) {
  if (n < 1024) return `${n} byte`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Tính "dấu vân tay" SHA-256 của file ngay trong trình duyệt (file không được gửi đi đâu)
async function hashFile(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return '0x' + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Người dùng chọn / kéo thả file: tính mã băm rồi kiểm tra trên blockchain
async function handleDocFile(file) {
  if (!file) return;
  if (file.size > MAX_DOC_BYTES) {
    alert(`File quá lớn (${formatBytes(file.size)}). Hãy chọn file dưới 500 MB.`);
    return;
  }
  docFileLabel.textContent = `Đang tính dấu vân tay của "${file.name}"...`;
  try {
    const hash = await hashFile(file);
    currentDoc = { hash, name: file.name, size: file.size };
    docFileLabel.textContent = `${file.name} (${formatBytes(file.size)}) · bấm để chọn file khác`;
    docHashInput.value = hash.slice(2);
    addLog(`Dấu vân tay SHA-256 của "${file.name}": ${hash.slice(2)}`, 'info');
    await checkDocument();
  } catch (error) {
    console.error(error);
    docFileLabel.textContent = 'Bấm để chọn tài liệu, hoặc kéo thả file vào đây';
    addLog(`Không đọc được file: ${error.message || error}`, 'error');
  } finally {
    docFileInput.value = ''; // cho phép chọn lại đúng file đó lần nữa
  }
}

// Kiểm tra theo mã băm người dùng dán vào ô (không cần file)
function checkPastedHash() {
  const raw = docHashInput.value.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    alert('Mã SHA-256 phải gồm đúng 64 ký tự (0-9, a-f).');
    return;
  }
  currentDoc = { hash: '0x' + raw, name: null, size: null };
  docFileLabel.textContent = 'Bấm để chọn tài liệu, hoặc kéo thả file vào đây';
  checkDocument();
}

// Đọc trạng thái của currentDoc trên chuỗi và hiện kết quả
async function checkDocument() {
  if (!currentDoc) return;
  docRegisterBox.hidden = true;
  docRevokeBtn.hidden = true;
  docResult.className = 'doc-result';
  docResult.textContent = 'Đang kiểm tra trên blockchain...';

  if (!docs) {
    docResult.textContent = NET.docsAddress
      ? 'Đang kết nối tới blockchain, vui lòng thử lại sau vài giây.'
      : `Chức năng xác thực tài liệu chưa được deploy trên mạng ${NET.label}.`;
    return;
  }

  try {
    const hash = currentDoc.hash;
    const r = await docs.verify(hash);
    docResult.innerHTML = '';

    const status = document.createElement('div');
    status.className = 'doc-status';
    docResult.appendChild(status);

    const hashEl = document.createElement('span');
    hashEl.className = 'mono';
    hashEl.textContent = hash.slice(2);
    if (currentDoc.name) docResult.appendChild(detailField('Tài liệu', `${currentDoc.name} (${formatBytes(currentDoc.size)})`));
    docResult.appendChild(detailField('Dấu vân tay SHA-256', hashEl));

    if (!r.registered) {
      docResult.classList.add('doc-missing');
      status.textContent = '✖ Chưa được đăng ký';
      const note = document.createElement('p');
      note.className = 'card-desc';
      note.textContent = 'Không có tài liệu nào với dấu vân tay này trên blockchain. Hoặc tài liệu chưa từng được đăng ký, hoặc đây là bản đã bị chỉnh sửa so với bản gốc.';
      docResult.appendChild(note);
      docRegisterBox.hidden = false;
      return;
    }

    // Tên tài liệu và mã giao dịch nằm trong sự kiện DocumentRegistered
    const [regEvents, revEvents] = await Promise.all([
      queryLogs(docs, docs.filters.DocumentRegistered(hash), NET.docsDeployBlock),
      r.revoked ? queryLogs(docs, docs.filters.DocumentRevoked(hash), NET.docsDeployBlock) : [],
    ]);
    const reg = regEvents[0];

    if (r.revoked) {
      docResult.classList.add('doc-revoked');
      status.textContent = '⚠ Tài liệu đã bị thu hồi';
    } else {
      docResult.classList.add('doc-ok');
      status.textContent = '✔ Tài liệu hợp lệ: đúng bản gốc đã đăng ký';
    }

    if (reg) docResult.appendChild(detailField('Tên tài liệu', reg.args.title));
    const issuerEl = document.createElement('span');
    issuerEl.className = 'mono';
    issuerEl.textContent = r.issuer + (userAccount && r.issuer.toLowerCase() === userAccount.toLowerCase() ? ' (bạn)' : '');
    docResult.appendChild(detailField('Người đăng ký', issuerEl));
    docResult.appendChild(detailField('Đăng ký lúc', formatTime(r.registeredAt)));
    if (revEvents[0]) docResult.appendChild(detailField('Thu hồi lúc', formatTime(revEvents[0].args.revokedAt)));
    if (reg) docResult.appendChild(detailField('Mã giao dịch', txChip(reg.transactionHash)));

    // Chỉ người đăng ký mới thấy nút Thu hồi (contract cũng kiểm tra lại)
    docRevokeBtn.hidden = !(!r.revoked && userAccount && r.issuer.toLowerCase() === userAccount.toLowerCase());
  } catch (error) {
    console.error(error);
    docResult.className = 'doc-result';
    docResult.textContent = `Không kiểm tra được: ${errorReason(error)}`;
  }
}

// Đăng ký currentDoc lên chuỗi (Requires Gas & MetaMask Sign)
async function registerDocument() {
  if (!docs || !currentDoc) return;
  const title = docTitleInput.value.trim();
  if (!title) {
    alert('Vui lòng nhập tên tài liệu!');
    return;
  }
  if (new TextEncoder().encode(title).length > 100) {
    alert('Tên tài liệu tối đa 100 byte!');
    return;
  }
  if (!confirm(`Đăng ký tài liệu "${title}" lên blockchain?\nTên tài liệu và dấu vân tay sẽ được công khai vĩnh viễn (nội dung file thì không).`)) return;
  if (!(await ensureWallet())) return;

  try {
    docRegisterBtn.disabled = true;
    docRegisterBtn.textContent = WAIT_SIGN_TEXT;
    addLog(`Chuẩn bị gửi giao dịch register("${title}")...`, 'info');
    const d = docs.connect(signer);
    const tx = await d.register(currentDoc.hash, title, await txOptions(d.register, [currentDoc.hash, title]));
    addLog(`Giao dịch đăng ký tài liệu đã được phát đi! TX Hash: ${tx.hash}`, 'info');
    if (NET.explorer) addLog(`Xem trên trình duyệt khối: ${NET.explorer}/tx/${tx.hash}`, 'info');
    docRegisterBtn.textContent = WAIT_MINED_TEXT;

    const receipt = await tx.wait();
    addLog(`✅ Đã đăng ký tài liệu "${title}" trong Block #${receipt.blockNumber}! Phí gas: ${ethers.formatEther(receipt.fee)} ETH`, 'success', true);
    docTitleInput.value = '';
    await updateWalletInfo();
    await checkDocument();
    await loadDocuments();
  } catch (error) {
    handleTxError(error);
  } finally {
    docRegisterBtn.disabled = false;
    docRegisterBtn.textContent = 'Đăng ký tài liệu lên blockchain';
  }
}

// Thu hồi currentDoc (chỉ người đăng ký)
async function revokeDocument() {
  if (!docs || !currentDoc) return;
  if (!confirm('Thu hồi tài liệu này? Sau khi thu hồi, ai kiểm tra cũng sẽ thấy "đã bị thu hồi". Không thể hoàn tác.')) return;
  if (!(await ensureWallet())) return;

  try {
    docRevokeBtn.disabled = true;
    docRevokeBtn.textContent = WAIT_SIGN_TEXT;
    addLog('Chuẩn bị gửi giao dịch revoke()...', 'info');
    const d = docs.connect(signer);
    const tx = await d.revoke(currentDoc.hash, await txOptions(d.revoke, [currentDoc.hash]));
    addLog(`Giao dịch thu hồi tài liệu đã được phát đi! TX Hash: ${tx.hash}`, 'info');
    docRevokeBtn.textContent = WAIT_MINED_TEXT;

    const receipt = await tx.wait();
    addLog(`✅ Đã thu hồi tài liệu trong Block #${receipt.blockNumber}! Phí gas: ${ethers.formatEther(receipt.fee)} ETH`, 'success', true);
    await updateWalletInfo();
    await checkDocument();
    await loadDocuments();
  } catch (error) {
    handleTxError(error);
  } finally {
    docRevokeBtn.disabled = false;
    docRevokeBtn.textContent = 'Thu hồi tài liệu này';
  }
}

// Bảng danh sách tài liệu đã đăng ký, lấy từ sự kiện trên chuỗi
async function loadDocuments() {
  if (!docs) return;
  try {
    const [registered, revoked] = await Promise.all([
      queryLogs(docs, docs.filters.DocumentRegistered(), NET.docsDeployBlock),
      queryLogs(docs, docs.filters.DocumentRevoked(), NET.docsDeployBlock),
    ]);
    const revokedSet = new Set(revoked.map((e) => e.args.docHash));
    registered.sort((a, b) => (b.blockNumber - a.blockNumber) || ((b.index ?? 0) - (a.index ?? 0)));

    docsList.innerHTML = '';
    if (registered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'display-content';
      empty.textContent = 'Chưa có tài liệu nào được đăng ký.';
      docsList.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'history-table';
    const head = document.createElement('tr');
    for (const t of ['Thời gian', 'Tên tài liệu', 'Người đăng ký', 'Dấu vân tay', 'Trạng thái', 'Mã giao dịch']) {
      const th = document.createElement('th');
      th.textContent = t;
      head.appendChild(th);
    }
    table.appendChild(head);

    for (const e of registered.slice(0, 100)) {
      const tr = document.createElement('tr');

      const tdTime = document.createElement('td');
      tdTime.textContent = formatTime(e.args.registeredAt);
      const tdTitle = document.createElement('td');
      tdTitle.className = 'note-cell';
      tdTitle.textContent = e.args.title;
      const tdIssuer = document.createElement('td');
      tdIssuer.textContent = addrLabel(e.args.issuer);
      tdIssuer.title = e.args.issuer;

      // Bấm vào dấu vân tay để kiểm tra tài liệu đó
      const tdHash = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = 'hash-chip mono';
      chip.textContent = shortHash(e.args.docHash);
      chip.title = `${e.args.docHash.slice(2)} (bấm để kiểm tra)`;
      chip.addEventListener('click', () => {
        currentDoc = { hash: e.args.docHash, name: null, size: null };
        docHashInput.value = e.args.docHash.slice(2);
        docResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        checkDocument();
      });
      tdHash.appendChild(chip);

      const tdStatus = document.createElement('td');
      const pill = document.createElement('span');
      const isRevoked = revokedSet.has(e.args.docHash);
      pill.className = `status-pill ${isRevoked ? 'revoked' : 'valid'}`;
      pill.textContent = isRevoked ? 'Đã thu hồi' : 'Hiệu lực';
      tdStatus.appendChild(pill);

      const tdTx = document.createElement('td');
      tdTx.appendChild(txChip(e.transactionHash));

      tr.append(tdTime, tdTitle, tdIssuer, tdHash, tdStatus, tdTx);
      table.appendChild(tr);
    }
    docsList.appendChild(table);
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc danh sách tài liệu: ${errorReason(error)}`, 'error');
  }
}

// Hiển thị tên mạng và điền sẵn địa chỉ contract theo NET
switchNetworkBtn.querySelector('span').textContent = `Chuyển sang ${NET.label}`;
document.getElementById('networkSubtitle').textContent = `Mọi bài viết và giao dịch được ghi công khai trên mạng ${NET.label}, không thể sửa lén.`;
addLog(`Sẵn sàng. DApp dùng mạng ${NET.label} (Chain ID ${NET.chainId}). Xem bài viết và lịch sử không cần ví; muốn đăng bài hoặc chuyển tiền thì bấm "Kết nối ví MetaMask".`, 'info');

// Mở lại thẻ chức năng lần trước (nếu có)
let savedTab = null;
try { savedTab = localStorage.getItem('blogchain-tab'); } catch {}
if (savedTab && document.querySelector(`.tab[data-tab="${savedTab}"]`)) showTab(savedTab);

// Event Listeners
for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => showTab(t.dataset.tab));
connectWalletBtn.addEventListener('click', connectWallet);
switchNetworkBtn.addEventListener('click', switchNetwork);
loadContractBtn.addEventListener('click', loadContract);
refreshPostsBtn.addEventListener('click', loadPosts);
showDeletedChk.addEventListener('change', loadPosts);
refreshHistoryBtn.addEventListener('click', loadHistory);
detailCloseBtn.addEventListener('click', closeDetail);
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetail(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
submitPostBtn.addEventListener('click', submitPost);
cancelEditBtn.addEventListener('click', resetForm);
sendTransferBtn.addEventListener('click', sendTransfer);
refreshTransfersBtn.addEventListener('click', loadTransfers);
myTransfersChk.addEventListener('change', loadTransfers);
txLookupBtn.addEventListener('click', lookupTx);
txLookupInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookupTx(); });
docFileInput.addEventListener('change', () => handleDocFile(docFileInput.files[0]));
docDropzone.addEventListener('dragover', (e) => { e.preventDefault(); docDropzone.classList.add('dragover'); });
docDropzone.addEventListener('dragleave', () => docDropzone.classList.remove('dragover'));
docDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  docDropzone.classList.remove('dragover');
  handleDocFile(e.dataTransfer.files[0]);
});
docCheckHashBtn.addEventListener('click', checkPastedHash);
docHashInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPastedHash(); });
docRegisterBtn.addEventListener('click', registerDocument);
docRevokeBtn.addEventListener('click', revokeDocument);
refreshDocsBtn.addEventListener('click', loadDocuments);
postImageInput.addEventListener('change', () => selectPostImage(postImageInput.files[0]));
postImageDrop.addEventListener('dragover', (e) => { e.preventDefault(); postImageDrop.classList.add('dragover'); });
postImageDrop.addEventListener('dragleave', () => postImageDrop.classList.remove('dragover'));
postImageDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  postImageDrop.classList.remove('dragover');
  selectPostImage(e.dataTransfer.files[0]);
});
postImageRemoveBtn.addEventListener('click', () => { clearPostImage(); postImageCidInput.value = ''; });
postImageCidInput.addEventListener('change', onCidInputChange);
pinataJwtInput.addEventListener('change', savePinataPref);
pinataRememberChk.addEventListener('change', savePinataPref);
pinataClearBtn.addEventListener('click', () => {
  pinataJwtInput.value = '';
  pinataRememberChk.checked = false;
  savePinataPref();
  addLog('Đã xóa khóa Pinata khỏi trình duyệt này.', 'info', true);
});

// Khóa Pinata đã lưu trên máy này (nếu người dùng từng chọn "Nhớ khóa")
try {
  const savedJwt = localStorage.getItem(PINATA_JWT_KEY);
  if (savedJwt) {
    pinataJwtInput.value = savedJwt;
    pinataRememberChk.checked = true;
  }
} catch {}
clearLogsBtn.addEventListener('click', () => {
  logsContainer.innerHTML = '<div class="log-entry log-info">[Hệ thống] Nhật ký đã được xóa.</div>';
});

// MetaMask Event Handlers (Tài khoản hoặc mạng thay đổi)
if (window.ethereum) {
  window.ethereum.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
      location.reload();
    } else {
      if (!provider) return; // chưa bấm "Kết nối ví" trên trang này thì bỏ qua
      userAccount = accounts[0];
      // Signer phải đổi theo tài khoản mới, nếu không giao dịch vẫn ký bằng ví cũ
      signer = await provider.getSigner();
      connectBtnText.textContent = shortAddr(userAccount);
      updateWalletInfo();
      addLog(`Chuyển sang tài khoản ví: ${userAccount}`, 'info');
      resetForm();
      if (contract) loadPosts(); // vẽ lại nút Sửa/Xóa theo tác giả mới
      if (payments) loadTransfers(); // cập nhật nhãn "(bạn)" và bộ lọc "giao dịch của tôi"
      if (docs) loadDocuments();
      if (currentDoc) checkDocument();
    }
  });

  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

// Mở trang là đọc dữ liệu ngay qua RPC công khai, chưa cần kết nối ví
(async () => {
  try {
    await loadContractsConfig();
  } catch (error) {
    console.error(error);
    addLog(`Không nạp được cấu hình contract: ${error.message || error}. Hãy tải lại trang.`, 'error');
    return;
  }
  if (NET.contractAddress) contractAddressInput.value = NET.contractAddress;
  // Nạp 3 contract cùng lúc thay vì lần lượt (RPC công khai chậm, nạp lần lượt mất ~8 giây)
  await Promise.all([NET.contractAddress ? loadContract() : null, initPayments(), initDocs()]);
  setInterval(pollNewEvents, POLL_MS);
})();

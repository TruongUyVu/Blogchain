// BlogChain ABI (lấy từ blogchain-truffle/build/contracts/BlogChain.json sau khi chạy truffle migrate)
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "author",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      }
    ],
    "name": "PostCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "author",
        "type": "address"
      }
    ],
    "name": "PostDeleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "author",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "updatedAt",
        "type": "uint256"
      }
    ],
    "name": "PostEdited",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_CONTENT_LENGTH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_TITLE_LENGTH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "content",
        "type": "string"
      }
    ],
    "name": "createPost",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "content",
        "type": "string"
      }
    ],
    "name": "editPost",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "deletePost",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPostCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getPost",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "author",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "content",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "updatedAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "deleted",
            "type": "bool"
          }
        ],
        "internalType": "struct BlogChain.Post",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Payments ABI (dạng chữ dễ đọc mà ethers v6 hiểu được; khớp với contracts/Payments.sol)
const PAYMENTS_ABI = [
  'event Transferred(uint256 indexed id, address indexed from, address indexed to, uint256 amount, string note, uint256 sentAt)',
  'function sendEth(address to, string note) payable returns (uint256 id)',
  'function transferCount() view returns (uint256)'
];

// State Variables
let provider = null;
let signer = null;
let contract = null;
let payments = null; // contract Payments (chuyển tiền)
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

const SUBMIT_TEXT_CREATE = '✍️ Đăng bài lên Blockchain (Gửi giao dịch)';
const TRANSFER_TEXT = '💸 Chuyển tiền (Gửi giao dịch)';
const SUBMIT_TEXT_EDIT = '💾 Lưu chỉnh sửa (Gửi giao dịch)';

// Các mạng DApp hỗ trợ.
//  - contractAddress: địa chỉ BlogChain trên mạng đó (in ra khi chạy truffle migrate), để trống thì người dùng tự dán.
//  - deployBlock: số block lúc deploy contract; đọc lịch sử sự kiện từ block này thay vì từ 0 cho nhanh.
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    label: 'Sepolia Testnet',
    contractAddress: '0x1b59c8aAAa7a258eafe7c708Fc27b6d4e2a7e7F0', // in ra khi chạy: truffle migrate --network sepolia
    deployBlock: 12146786, // dòng "block number" của BlogChain khi deploy
    paymentsAddress: '0xaDBF8d7370383A83Eef6d3844b30f285Fc9f7e1c', // contract Payments (3_deploy_payments.js)
    paymentsDeployBlock: 12151014,
    priorityFeeGwei: '0.05', // tip trả cho validator, xem feeOverrides()
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
    label: 'Ganache Local',
    contractAddress: '',
    deployBlock: 0,
    paymentsAddress: '',
    paymentsDeployBlock: 0,
    priorityFeeGwei: null, // Ganache: để MetaMask tự chọn phí
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
  const block = await provider.getBlock('latest');
  const tip = ethers.parseUnits(NET.priorityFeeGwei, 'gwei');
  return { maxPriorityFeePerGas: tip, maxFeePerGas: block.baseFeePerGas * 2n + tip };
}

// Helper: Logging
function addLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${timestamp}] ${message}`;
  logsContainer.appendChild(entry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
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
    networkStatusDot.className = 'status-dot online';
    addLog(`Đã kết nối thành công với ví: ${userAccount}`, 'success');

    // Có sẵn địa chỉ contract thì tự nạp luôn, người dùng không phải làm Bước 1
    if (!contract && ethers.isAddress(contractAddressInput.value.trim())) {
      await loadContract();
    }
    await initPayments();

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
    if (chainIdNow !== NET.chainId) {
      networkNameEl.textContent = `Chain ID: ${chainIdNow} - SAI MẠNG (cần ${NET.label} ${NET.chainId})`;
      networkStatusDot.className = 'status-dot offline';
      addLog(`MetaMask đang ở Chain ID ${chainIdNow}, không phải ${NET.label} (${NET.chainId}). Bấm "Chuyển sang ${NET.label}" trước khi dùng.`, 'error');
    } else {
      networkNameEl.textContent = `Chain ID: ${chainIdNow} (${NET.label})`;
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

  if (!signer) {
    addLog('Vui lòng kết nối ví MetaMask trước khi nạp Contract.', 'warn');
    await connectWallet();
    if (!signer) return;
  }

  try {
    addLog(`Đang kết nối tới Contract tại: ${address}...`, 'info');

    // Kiểm tra địa chỉ có thực sự chứa contract trên mạng hiện tại không
    // (hay gặp khi Ganache bị reset hoặc MetaMask đang ở mạng khác)
    const code = await provider.getCode(address);
    if (code === '0x') {
      addLog(`Không có contract nào ở địa chỉ này trên mạng MetaMask đang chọn. Hãy kiểm tra lại địa chỉ (sau mỗi lần truffle migrate) và chắc chắn MetaMask đang ở mạng ${NET.label}.`, 'error');
      return;
    }

    // Gỡ listener của contract cũ (nếu nạp lại) để không bị nhận sự kiện trùng
    if (contract) await contract.removeAllListeners();

    contract = new ethers.Contract(address, CONTRACT_ABI, signer);
    blockTimeCache.clear();

    contractStatusBox.className = 'contract-status-box active';
    contractStatusText.innerHTML = `✅ Đã kết nối Contract: <strong>${address.slice(0, 10)}...${address.slice(-6)}</strong>`;
    addLog(`Đã nạp Contract BlogChain thành công!`, 'success');

    // Tự động đọc danh sách bài lần đầu
    await loadPosts();

    // Lắng nghe sự kiện của BlogChain trên Blockchain thời gian thực
    contract.on('PostCreated', (id, author, title) => {
      addLog(`⚡ [Event PostCreated] Bài #${id} "${title}" được đăng bởi ${shortAddr(author)}`, 'success');
      loadPosts();
    });
    contract.on('PostEdited', (id, author) => {
      addLog(`⚡ [Event PostEdited] Bài #${id} được sửa bởi ${shortAddr(author)}`, 'success');
      loadPosts();
    });
    contract.on('PostDeleted', (id, author) => {
      addLog(`⚡ [Event PostDeleted] Bài #${id} bị xóa bởi ${shortAddr(author)}`, 'success');
      loadPosts();
    });

  } catch (error) {
    console.error(error);
    addLog(`Không thể kết nối Contract: ${error.message}`, 'error');
  }
}

// 4. Đọc danh sách bài viết (No Gas)
async function loadPosts() {
  if (!contract) {
    addLog('Chưa có Contract nào được kết nối. Hãy nhập Contract Address ở Bước 1.', 'warn');
    return;
  }

  try {
    addLog('Đang gọi getPostCount() và getPost() từ Blockchain...', 'info');
    const count = Number(await contract.getPostCount());

    const all = [];
    for (let i = count - 1; i >= 0; i--) {
      all.push(await contract.getPost(i));
    }

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

    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = p.content;

    card.append(title, meta, content);

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
  const b = await provider.getBlock(blockNumber);
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
    const tx = await provider.getTransaction(hash);
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
    const c = document.createElement('div');
    c.className = 'post-content';
    c.textContent = content.content;
    body.append(t, c);
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
      contract.queryFilter(contract.filters.PostCreated(id), NET.deployBlock, 'latest'),
      contract.queryFilter(contract.filters.PostEdited(id), NET.deployBlock, 'latest'),
      contract.queryFilter(contract.filters.PostDeleted(id), NET.deployBlock, 'latest'),
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
    const cur = document.createElement('div');
    cur.className = 'post-content';
    cur.textContent = p.content;
    detailBody.appendChild(cur);

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
  if (!contract || !provider) return;
  try {
    const [created, edited, deleted] = await Promise.all([
      contract.queryFilter(contract.filters.PostCreated(), NET.deployBlock, 'latest'),
      contract.queryFilter(contract.filters.PostEdited(), NET.deployBlock, 'latest'),
      contract.queryFilter(contract.filters.PostDeleted(), NET.deployBlock, 'latest'),
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

// Chuyển form sang chế độ sửa bài
function startEdit(post) {
  editingPostId = post.id;
  postTitleInput.value = post.title;
  postContentInput.value = post.content;
  writeModeLabel.textContent = `editPost(${post.id}, title, content)`;
  submitPostBtn.textContent = SUBMIT_TEXT_EDIT;
  cancelEditBtn.style.display = '';
  postTitleInput.focus();
}

// Quay lại chế độ đăng bài mới
function resetForm() {
  editingPostId = null;
  postTitleInput.value = '';
  postContentInput.value = '';
  writeModeLabel.textContent = 'createPost(title, content)';
  submitPostBtn.textContent = SUBMIT_TEXT_CREATE;
  cancelEditBtn.style.display = 'none';
}

// Gửi giao dịch (contract.connect(signer) để luôn ký bằng tài khoản MetaMask hiện tại), chờ mined rồi cập nhật lại giao diện
async function sendTx(label, txPromise) {
  const tx = await txPromise;
  addLog(`Giao dịch ${label} đã được phát đi! TX Hash: ${tx.hash}`, 'info');
  if (NET.explorer) addLog(`Xem trên trình duyệt khối: ${NET.explorer}/tx/${tx.hash}`, 'info');
  submitPostBtn.textContent = '⛏️ Đang xác thực Block (Mining)...';

  // Chờ giao dịch được đóng gói vào Block (Sepolia mất khoảng 12-30 giây)
  const receipt = await tx.wait();
  addLog(`✅ Giao dịch thành công trong Block #${receipt.blockNumber}! Gas sử dụng: ${receipt.gasUsed.toString()} · Phí: ${ethers.formatEther(receipt.fee)} ETH`, 'success');

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
    addLog('Chưa kết nối Contract! Vui lòng nạp Contract ở Bước 1 trước.', 'warn');
    return;
  }

  const title = postTitleInput.value.trim();
  const content = postContentInput.value.trim();
  if (!title || !content) {
    alert('Vui lòng nhập đầy đủ tiêu đề và nội dung!');
    return;
  }

  // Giới hạn tính theo byte giống trong contract (tiếng Việt có dấu chiếm nhiều byte hơn 1 ký tự)
  const encoder = new TextEncoder();
  if (encoder.encode(title).length > 100 || encoder.encode(content).length > 2000) {
    alert('Tiêu đề tối đa 100 byte, nội dung tối đa 2000 byte!');
    return;
  }

  try {
    submitPostBtn.disabled = true;
    submitPostBtn.textContent = '⏳ Đang chờ ký MetaMask...';

    if (editingPostId === null) {
      addLog(`Chuẩn bị gửi giao dịch createPost("${title}")...`, 'info');
      await sendTx('createPost', contract.connect(signer).createPost(title, content, await feeOverrides()));
    } else {
      addLog(`Chuẩn bị gửi giao dịch editPost(${editingPostId}, "${title}")...`, 'info');
      await sendTx('editPost', contract.connect(signer).editPost(editingPostId, title, content, await feeOverrides()));
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

  try {
    submitPostBtn.disabled = true;
    addLog(`Chuẩn bị gửi giao dịch deletePost(${id})...`, 'info');
    await sendTx('deletePost', contract.connect(signer).deletePost(id, await feeOverrides()));
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
    txLookupInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lookupTx();
  });
  return el;
}

// Địa chỉ ví rút gọn, thêm "(bạn)" nếu là ví đang kết nối
function addrLabel(addr) {
  const mine = userAccount && addr.toLowerCase() === userAccount.toLowerCase();
  return `${shortAddr(addr)}${mine ? ' (bạn)' : ''}`;
}

// Nạp contract Payments (gọi sau khi kết nối ví)
async function initPayments() {
  if (payments) return;
  if (!NET.paymentsAddress) {
    transfersList.innerHTML = `<div class="display-content">Contract Payments chưa được deploy trên mạng ${NET.label}.</div>`;
    return;
  }
  try {
    const code = await provider.getCode(NET.paymentsAddress);
    if (code === '0x') {
      addLog(`Không tìm thấy contract Payments trên mạng MetaMask đang chọn. Hãy chuyển sang ${NET.label}.`, 'error');
      return;
    }
    payments = new ethers.Contract(NET.paymentsAddress, PAYMENTS_ABI, signer);
    addLog('Đã nạp contract Payments (chuyển tiền).', 'success');
    await loadTransfers();

    payments.on('Transferred', (id, from, to, amount) => {
      addLog(`⚡ [Event Transferred] ${shortAddr(from)} → ${shortAddr(to)}: ${ethers.formatEther(amount)} ETH`, 'success');
      loadTransfers();
    });
  } catch (error) {
    console.error(error);
    addLog(`Không nạp được contract Payments: ${errorReason(error)}`, 'error');
  }
}

// Chuyển ETH qua contract Payments (Requires Gas & MetaMask Sign)
async function sendTransfer() {
  if (!payments) {
    addLog('Chưa nạp contract Payments. Hãy kết nối MetaMask (đúng mạng) trước.', 'warn');
    return;
  }

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
    sendTransferBtn.textContent = '⏳ Đang chờ ký MetaMask...';
    addLog(`Chuẩn bị gửi giao dịch sendEth(${shortAddr(to)}) kèm ${ethers.formatEther(value)} ETH...`, 'info');

    const tx = await payments.connect(signer).sendEth(to, note, { value, ...(await feeOverrides()) });
    addLog(`Giao dịch chuyển tiền đã được phát đi! TX Hash: ${tx.hash}`, 'info');
    if (NET.explorer) addLog(`Xem trên trình duyệt khối: ${NET.explorer}/tx/${tx.hash}`, 'info');
    sendTransferBtn.textContent = '⛏️ Đang xác thực Block (Mining)...';

    const receipt = await tx.wait();
    addLog(`✅ Đã chuyển ${ethers.formatEther(value)} ETH tới ${shortAddr(to)} trong Block #${receipt.blockNumber}! Phí gas: ${ethers.formatEther(receipt.fee)} ETH`, 'success');

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
    let events = await payments.queryFilter(payments.filters.Transferred(), NET.paymentsDeployBlock, 'latest');
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
  if (!provider) {
    addLog('Hãy kết nối MetaMask trước khi tra cứu giao dịch.', 'warn');
    return;
  }

  txLookupResult.innerHTML = '<div class="display-content">Đang tra cứu trên blockchain...</div>';
  try {
    const [tx, receipt] = await Promise.all([provider.getTransaction(hash), provider.getTransactionReceipt(hash)]);
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

// Hiển thị tên mạng và điền sẵn địa chỉ contract theo NET
document.getElementById('switchNetworkBtn').textContent = `🔀 Chuyển sang ${NET.label}`;
document.getElementById('networkSubtitle').textContent = `Tương tác Smart Contract trên mạng ${NET.label}`;
if (NET.contractAddress) contractAddressInput.value = NET.contractAddress;
addLog(`Sẵn sàng. DApp dùng mạng ${NET.label} (Chain ID ${NET.chainId}). Bấm "Kết nối MetaMask" để bắt đầu.`, 'info');

// Event Listeners
connectWalletBtn.addEventListener('click', connectWallet);
document.getElementById('switchNetworkBtn').addEventListener('click', switchNetwork);
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
clearLogsBtn.addEventListener('click', () => {
  logsContainer.innerHTML = '<div class="log-entry log-info">[Hệ thống] Nhật ký đã được xóa.</div>';
});

// MetaMask Event Handlers (Tài khoản hoặc mạng thay đổi)
if (window.ethereum) {
  window.ethereum.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
      location.reload();
    } else {
      userAccount = accounts[0];
      // Signer phải đổi theo tài khoản mới, nếu không giao dịch vẫn ký bằng ví cũ
      if (provider) signer = await provider.getSigner();
      connectBtnText.textContent = shortAddr(userAccount);
      updateWalletInfo();
      addLog(`Chuyển sang tài khoản ví: ${userAccount}`, 'info');
      resetForm();
      if (contract) loadPosts(); // vẽ lại nút Sửa/Xóa theo tác giả mới
      if (payments) loadTransfers(); // cập nhật nhãn "(bạn)" và bộ lọc "giao dịch của tôi"
    }
  });

  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

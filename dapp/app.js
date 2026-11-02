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

// State Variables
let provider = null;
let signer = null;
let contract = null;
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

const SUBMIT_TEXT_CREATE = '✍️ Đăng bài lên Blockchain (Gửi giao dịch)';
const SUBMIT_TEXT_EDIT = '💾 Lưu chỉnh sửa (Gửi giao dịch)';

// Mạng Ganache cục bộ (Chain ID mặc định của Ganache là 1337 = 0x539)
const GANACHE_CHAIN_ID = 1337;
const GANACHE_CHAIN_PARAMS = {
  chainId: '0x539',
  chainName: 'Ganache Local',
  rpcUrls: ['http://127.0.0.1:7545'],
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
};

// Thêm (nếu chưa có) và chuyển MetaMask sang mạng Ganache
async function switchToGanache() {
  if (typeof window.ethereum === 'undefined') {
    addLog('Không tìm thấy MetaMask!', 'error');
    return;
  }
  try {
    addLog('Đang yêu cầu MetaMask chuyển sang mạng Ganache...', 'info');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: GANACHE_CHAIN_PARAMS.chainId }]
      });
    } catch (switchError) {
      const msg = String(switchError.message || '');
      const notAdded = switchError.code === 4902 || /unrecognized chain|not been added/i.test(msg);
      if (!notAdded) throw switchError;
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [GANACHE_CHAIN_PARAMS]
      });
    }
    addLog('Đã chuyển sang mạng Ganache. Hãy bấm "Kết nối MetaMask" nếu số dư chưa cập nhật.', 'success');
  } catch (error) {
    console.error(error);
    addLog(`Không chuyển được mạng: ${error.message || error}. Nếu MetaMask báo Chain ID không khớp, hãy thêm mạng thủ công bằng đúng Chain ID Ganache báo.`, 'error');
  }
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
  if (all.includes('nonce')) hint = ' → GỢI Ý: MetaMask lệch nonce sau khi Ganache khởi động lại. Vào MetaMask > Settings > Advanced > Clear activity tab data.';
  else if (all.includes('insufficient funds') || all.includes("doesn't have enough funds")) hint = ' → GỢI Ý: tài khoản đang chọn không đủ ETH để trả phí gas.';
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
    if (chainIdNow !== GANACHE_CHAIN_ID) {
      networkNameEl.textContent = `Chain ID: ${chainIdNow} - SAI MẠNG (cần Ganache ${GANACHE_CHAIN_ID})`;
      networkStatusDot.className = 'status-dot offline';
      addLog(`MetaMask đang ở Chain ID ${chainIdNow}, không phải Ganache (${GANACHE_CHAIN_ID}). Bấm "Chuyển sang Ganache" trước khi dùng.`, 'error');
    } else {
      networkNameEl.textContent = `Chain ID: ${chainIdNow} (Ganache)`;
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
      addLog('Không có contract nào ở địa chỉ này trên mạng MetaMask đang chọn. Hãy kiểm tra lại địa chỉ (sau mỗi lần truffle migrate) và mạng Ganache.', 'error');
      return;
    }

    // Gỡ listener của contract cũ (nếu nạp lại) để không bị nhận sự kiện trùng
    if (contract) await contract.removeAllListeners();

    contract = new ethers.Contract(address, CONTRACT_ABI, signer);

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

    const posts = [];
    for (let i = count - 1; i >= 0; i--) {
      const p = await contract.getPost(i);
      if (!p.deleted) posts.push(p); // bỏ qua bài đã xóa mềm
    }

    postCountDisplay.textContent = `${posts.length} bài (tổng đã đăng: ${count})`;
    renderPosts(posts);
    addLog(`Đọc thành công ${posts.length} bài viết từ Smart Contract.`, 'success');
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
    card.className = 'display-box post-card';

    const title = document.createElement('div');
    title.className = 'post-title';
    title.textContent = `#${p.id} · ${p.title}`;

    const meta = document.createElement('div');
    meta.className = 'display-label';
    const edited = p.updatedAt !== p.createdAt ? ` · sửa lúc ${formatTime(p.updatedAt)}` : '';
    meta.textContent = `${shortAddr(p.author)} · ${formatTime(p.createdAt)}${edited}`;

    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = p.content;

    card.append(title, meta, content);

    // Chỉ tác giả mới thấy nút Sửa / Xóa (contract cũng kiểm tra lại bằng onlyAuthor)
    if (userAccount && p.author.toLowerCase() === userAccount.toLowerCase()) {
      const actions = document.createElement('div');
      actions.className = 'post-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-outline';
      editBtn.textContent = '✏️ Sửa';
      editBtn.addEventListener('click', () => startEdit(p));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-outline';
      deleteBtn.textContent = '🗑️ Xóa';
      deleteBtn.addEventListener('click', () => deletePost(p.id));

      actions.append(editBtn, deleteBtn);
      card.appendChild(actions);
    }

    postsList.appendChild(card);
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
  submitPostBtn.textContent = '⛏️ Đang xác thực Block (Mining)...';

  // Chờ giao dịch được đóng gói vào Block trên Ganache
  const receipt = await tx.wait();
  addLog(`✅ Giao dịch thành công trong Block #${receipt.blockNumber}! Gas sử dụng: ${receipt.gasUsed.toString()}`, 'success');

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
      await sendTx('createPost', contract.connect(signer).createPost(title, content));
    } else {
      addLog(`Chuẩn bị gửi giao dịch editPost(${editingPostId}, "${title}")...`, 'info');
      await sendTx('editPost', contract.connect(signer).editPost(editingPostId, title, content));
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
    await sendTx('deletePost', contract.connect(signer).deletePost(id));
    if (editingPostId !== null && editingPostId === id) resetForm();
  } catch (error) {
    handleTxError(error);
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = editingPostId === null ? SUBMIT_TEXT_CREATE : SUBMIT_TEXT_EDIT;
  }
}

// Event Listeners
connectWalletBtn.addEventListener('click', connectWallet);
document.getElementById('switchNetworkBtn').addEventListener('click', switchToGanache);
loadContractBtn.addEventListener('click', loadContract);
refreshPostsBtn.addEventListener('click', loadPosts);
submitPostBtn.addEventListener('click', submitPost);
cancelEditBtn.addEventListener('click', resetForm);
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
    }
  });

  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

/*
 * issuers.js – module "Người phát hành đã xác minh" (contract IssuerRegistry), nằm trong thẻ Xác thực.
 * Danh bạ: ví nào thuộc đơn vị có thẩm quyền (Viện, giảng viên, trợ giảng) và tên hiển thị.
 * Module Xác thực (docs.js) gọi issuerOf(địa chỉ) để hiện "✔ tên đơn vị" hoặc "chưa xác minh".
 */
let issuerRegistry = null; // contract IssuerRegistry
let issuerOwner = null; // địa chỉ chủ sở hữu danh bạ
const ISSUERS = new Map(); // địa chỉ (chữ thường) → { address, name, since, txHash }

const issuerPanel = document.getElementById('issuerPanel');
const issuerList = document.getElementById('issuerList');
const issuerOwnerBox = document.getElementById('issuerOwnerBox');
const issuerAddressInput = document.getElementById('issuerAddressInput');
const issuerNameInput = document.getElementById('issuerNameInput');
const issuerSetBtn = document.getElementById('issuerSetBtn');
const issuerRemoveBtn = document.getElementById('issuerRemoveBtn');
const issuerYourRole = document.getElementById('issuerYourRole');

// Danh bạ đã nạp được chưa (chưa deploy trên mạng đang dùng thì không hiện nhãn "chưa xác minh", tránh hiểu nhầm)
function issuersEnabled() {
  return Boolean(issuerRegistry);
}

// Người phát hành đã xác minh của một ví, hoặc null
function issuerOf(address) {
  return (address && ISSUERS.get(address.toLowerCase())) || null;
}

// Nhãn hiển thị cho ví đã đăng ký tài liệu: "✔ tên đơn vị" hoặc "chưa xác minh" (dùng trong bảng / kết quả kiểm tra)
function issuerBadge(address) {
  const info = issuerOf(address);
  const el = document.createElement('span');
  if (info) {
    el.className = 'issuer-badge';
    el.textContent = `✔ ${info.name}`;
    el.title = `${address} · người phát hành đã xác minh`;
  } else {
    el.className = 'issuer-unverified';
    el.textContent = `${shortAddr(address)}${isMe(address) ? ' (bạn)' : ''} · chưa xác minh`;
    el.title = address;
  }
  return el;
}

async function initIssuers() {
  if (issuerRegistry || !contractAddress('IssuerRegistry')) return;
  issuerRegistry = await loadReadContract('IssuerRegistry');
  if (!issuerRegistry) return;
  issuerPanel.hidden = false;
  addLog('Đã nạp contract IssuerRegistry (người phát hành đã xác minh).', 'success');
  await loadIssuers();
}

// Dựng lại danh bạ bằng cách áp lần lượt các sự kiện IssuerSet / IssuerRemoved (một lần đọc, không hỏi từng ví)
async function loadIssuers() {
  if (!issuerRegistry) return;
  try {
    const from = deployBlockOf('IssuerRegistry');
    const [owner, setEvs, removeEvs] = await Promise.all([
      issuerRegistry.owner(),
      queryLogs(issuerRegistry, issuerRegistry.filters.IssuerSet(), from),
      queryLogs(issuerRegistry, issuerRegistry.filters.IssuerRemoved(), from),
    ]);
    issuerOwner = owner;
    const evs = [...setEvs, ...removeEvs].sort((a, b) => newestFirst(b, a)); // cũ nhất trước
    ISSUERS.clear();
    for (const e of evs) {
      const key = e.args.account.toLowerCase();
      if (e.eventName === 'IssuerRemoved') ISSUERS.delete(key);
      else ISSUERS.set(key, { address: e.args.account, name: e.args.name, since: ISSUERS.get(key)?.since ?? Number(e.args.setAt), txHash: e.transactionHash });
    }
    renderIssuers();
    updateIssuerRole();
    if (typeof refreshDocsView === 'function') refreshDocsView(); // vẽ lại nhãn ✔ trong thẻ Xác thực
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc danh bạ người phát hành: ${errorReason(error)}`, 'error');
  }
}

function renderIssuers() {
  issuerList.innerHTML = '';
  if (ISSUERS.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Chưa có người phát hành nào được xác minh.';
    issuerList.appendChild(empty);
    return;
  }
  const table = document.createElement('table');
  table.className = 'history-table';
  const head = document.createElement('tr');
  for (const t of ['Tên đơn vị / chức danh', 'Địa chỉ ví', 'Xác minh từ', 'Mã giao dịch']) {
    const th = document.createElement('th');
    th.textContent = t;
    head.appendChild(th);
  }
  table.appendChild(head);
  for (const i of ISSUERS.values()) {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.className = 'note-cell';
    tdName.textContent = i.name;
    const tdAddr = document.createElement('td');
    tdAddr.className = 'mono';
    tdAddr.textContent = addrLabel(i.address);
    tdAddr.title = i.address;
    const tdSince = document.createElement('td');
    tdSince.textContent = formatTime(i.since);
    const tdTx = document.createElement('td');
    tdTx.appendChild(txChip(i.txHash));
    tr.append(tdName, tdAddr, tdSince, tdTx);
    table.appendChild(tr);
  }
  issuerList.appendChild(table);
}

// Chỉ chủ sở hữu danh bạ mới thấy ô thêm / gỡ
function updateIssuerRole() {
  const owner = isMe(issuerOwner);
  issuerOwnerBox.hidden = !owner;
  issuerYourRole.textContent = owner
    ? 'Bạn là CHỦ SỞ HỮU danh bạ: thêm, đổi tên hoặc gỡ người phát hành.'
    : `Chỉ chủ sở hữu danh bạ (${issuerOwner ? shortAddr(issuerOwner) : 'ví của Viện'}) mới thêm / gỡ được.`;
}

// Xác minh một ví (hoặc đổi tên), chỉ chủ sở hữu
async function setIssuer() {
  const addr = issuerAddressInput.value.trim();
  const name = issuerNameInput.value.trim();
  if (!ethers.isAddress(addr)) {
    alert('Địa chỉ ví không đúng định dạng (0x...)');
    return;
  }
  if (!name) {
    alert('Vui lòng nhập tên hiển thị!');
    return;
  }
  if (byteLength(name) > 100) {
    alert('Tên hiển thị tối đa 100 byte!');
    return;
  }
  if (!confirm(`Xác minh ví ${addr}\nvới tên "${name}"?\nTên này công khai vĩnh viễn trên blockchain.`)) return;
  const receipt = await runTx({
    label: `setIssuer(${shortAddr(addr)}, "${name}")`,
    button: issuerSetBtn,
    successMessage: `Đã xác minh ${shortAddr(addr)} là "${name}"`,
    build: async (s) => {
      const c = issuerRegistry.connect(s);
      return c.setIssuer(addr, name, await txOptions(c.setIssuer, [addr, name]));
    },
  });
  if (!receipt) return;
  issuerAddressInput.value = '';
  issuerNameInput.value = '';
  await loadIssuers();
}

// Gỡ xác minh một ví, chỉ chủ sở hữu
async function removeIssuer() {
  const addr = issuerAddressInput.value.trim();
  if (!ethers.isAddress(addr)) {
    alert('Địa chỉ ví không đúng định dạng (0x...)');
    return;
  }
  if (!confirm(`Gỡ xác minh ví ${addr}?\nTài liệu ví này đã đăng ký vẫn còn, chỉ không còn nhãn ✔.`)) return;
  const receipt = await runTx({
    label: `removeIssuer(${shortAddr(addr)})`,
    button: issuerRemoveBtn,
    successMessage: `Đã gỡ xác minh ${shortAddr(addr)}`,
    build: async (s) => {
      const c = issuerRegistry.connect(s);
      return c.removeIssuer(addr, await txOptions(c.removeIssuer, [addr]));
    },
  });
  if (!receipt) return;
  issuerAddressInput.value = '';
  await loadIssuers();
}

issuerSetBtn.addEventListener('click', setIssuer);
issuerRemoveBtn.addEventListener('click', removeIssuer);

// ---------- Đăng ký module với lõi (xem core.js) ----------
registerModule({
  name: 'Người phát hành',
  init: initIssuers,
  onWalletChanged: () => {
    if (!issuerRegistry) return;
    updateIssuerRole();
    renderIssuers(); // nhãn "(bạn)"
  },
  onReadProviderChanged: () => {
    if (issuerRegistry) issuerRegistry = issuerRegistry.connect(readProvider);
  },
  poll: async (from, latest) => {
    if (!issuerRegistry) return;
    const evs = await issuerRegistry.queryFilter('*', from, latest);
    for (const e of evs) {
      if (e.eventName === 'IssuerSet') logEvent(e, `${shortAddr(e.args.account)} được xác minh là "${e.args.name}"`);
      if (e.eventName === 'IssuerRemoved') logEvent(e, `${shortAddr(e.args.account)} bị gỡ xác minh`);
    }
    if (evs.length) await loadIssuers();
  },
  describeTx: (tx, contractName) => (contractName === 'IssuerRegistry' ? { kind: 'Cập nhật danh bạ người phát hành (IssuerRegistry)' } : null),
});

addErrorHints([
  ['not a verified issuer', 'ví này chưa có trong danh bạ người phát hành.'],
  ['name is too long', 'tên hiển thị tối đa 100 byte.'],
]);

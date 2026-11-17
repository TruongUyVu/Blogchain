/*
 * docs.js – module "Xác thực tài liệu" (thẻ Xác thực, contract DocumentRegistry).
 * Trình duyệt tự tính dấu vân tay SHA-256 của file; chỉ dấu vân tay + tên tài liệu được ghi lên blockchain.
 */
let docs = null; // contract DocumentRegistry
let currentDoc = null; // tài liệu đang kiểm tra: { hash, name, size }

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

const MAX_DOC_BYTES = 500 * 1024 * 1024; // file quá lớn thì trình duyệt đọc chậm / hết bộ nhớ

// Nạp contract DocumentRegistry (gọi khi mở trang, không cần ví)
async function initDocs() {
  if (docs) return;
  if (!contractAddress('DocumentRegistry')) {
    docsList.innerHTML = `<div class="display-content">Chức năng xác thực tài liệu chưa được deploy trên mạng ${NET.label}.</div>`;
    return;
  }
  // Gắn với readProvider để đọc; khi đăng ký / thu hồi thì dùng docs.connect(signer)
  docs = await loadReadContract('DocumentRegistry');
  if (!docs) return;
  addLog('Đã nạp contract DocumentRegistry (xác thực tài liệu).', 'success');
  await loadDocuments();
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
    docResult.textContent = contractAddress('DocumentRegistry')
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
      queryLogs(docs, docs.filters.DocumentRegistered(hash), deployBlockOf('DocumentRegistry')),
      r.revoked ? queryLogs(docs, docs.filters.DocumentRevoked(hash), deployBlockOf('DocumentRegistry')) : [],
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

// Đăng ký currentDoc lên chuỗi (cần ký bằng MetaMask, tốn phí gas)
async function registerDocument() {
  if (!docs || !currentDoc) return;
  const title = docTitleInput.value.trim();
  if (!title) {
    alert('Vui lòng nhập tên tài liệu!');
    return;
  }
  if (byteLength(title) > 100) {
    alert('Tên tài liệu tối đa 100 byte!');
    return;
  }
  if (!confirm(`Đăng ký tài liệu "${title}" lên blockchain?\nTên tài liệu và dấu vân tay sẽ được công khai vĩnh viễn (nội dung file thì không).`)) return;

  const hash = currentDoc.hash;
  const receipt = await runTx({
    label: `register("${title}")`,
    button: docRegisterBtn,
    successMessage: `Đã đăng ký tài liệu "${title}"`,
    build: async (s) => {
      const d = docs.connect(s);
      return d.register(hash, title, await txOptions(d.register, [hash, title]));
    },
  });
  if (!receipt) return;
  docTitleInput.value = '';
  await checkDocument();
  await loadDocuments();
}

// Thu hồi currentDoc (chỉ người đăng ký)
async function revokeDocument() {
  if (!docs || !currentDoc) return;
  if (!confirm('Thu hồi tài liệu này? Sau khi thu hồi, ai kiểm tra cũng sẽ thấy "đã bị thu hồi". Không thể hoàn tác.')) return;

  const hash = currentDoc.hash;
  const receipt = await runTx({
    label: 'revoke()',
    button: docRevokeBtn,
    successMessage: 'Đã thu hồi tài liệu',
    build: async (s) => {
      const d = docs.connect(s);
      return d.revoke(hash, await txOptions(d.revoke, [hash]));
    },
  });
  if (!receipt) return;
  await checkDocument();
  await loadDocuments();
}

// Bảng danh sách tài liệu đã đăng ký, lấy từ sự kiện trên chuỗi
async function loadDocuments() {
  if (!docs) return;
  try {
    const [registered, revoked] = await Promise.all([
      queryLogs(docs, docs.filters.DocumentRegistered(), deployBlockOf('DocumentRegistry')),
      queryLogs(docs, docs.filters.DocumentRevoked(), deployBlockOf('DocumentRegistry')),
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

// ---------- Đăng ký module với lõi (xem core.js) ----------
registerModule({
  name: 'Xác thực tài liệu',
  init: initDocs,
  onWalletChanged: async () => {
    if (docs) loadDocuments(); // cập nhật nhãn "(bạn)"
    if (currentDoc) checkDocument(); // hiện nút Thu hồi nếu mình là người đăng ký
  },
  onReadProviderChanged: () => {
    if (docs) docs = docs.connect(readProvider);
  },
  poll: async (from, latest) => {
    if (!docs) return;
    const evs = await docs.queryFilter('*', from, latest);
    for (const e of evs) {
      if (e.eventName === 'DocumentRegistered') logEvent(e, `"${e.args.title}" được đăng ký bởi ${shortAddr(e.args.issuer)}`);
      if (e.eventName === 'DocumentRevoked') logEvent(e, `Tài liệu ${shortHash(e.args.docHash)} bị thu hồi bởi ${shortAddr(e.args.issuer)}`);
    }
    if (evs.length) {
      loadDocuments();
      if (currentDoc) checkDocument();
    }
  },
});

addErrorHints([
  ['already registered', 'tài liệu này đã được đăng ký từ trước (có thể bởi người khác).'],
  ['only the issuer', 'chỉ ví đã đăng ký tài liệu mới thu hồi được.'],
  ['already revoked', 'tài liệu này đã bị thu hồi rồi.'],
]);
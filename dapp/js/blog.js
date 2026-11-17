/*
 * blog.js – module "Blog" (thẻ Blog): bài viết (contract BlogChain) và kiểm duyệt nội dung (contract BlogModeration).
 */
let contract = null; // contract BlogChain
let moderation = null; // contract BlogModeration (kiểm duyệt bài viết)
let canModerate = false; // ví đang kết nối có quyền ẩn / hiện bài không
let isModOwner = false; // ví đang kết nối là chủ sở hữu contract kiểm duyệt (thêm / bớt quản trị viên)
let editingPostId = null; // null = đang đăng bài mới, số = đang sửa bài có id đó

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
const showDeletedChk = document.getElementById('showDeletedChk');
const historyList = document.getElementById('historyList');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const detailModal = document.getElementById('detailModal');
const detailTitle = document.getElementById('detailTitle');
const detailBody = document.getElementById('detailBody');
const detailCloseBtn = document.getElementById('detailCloseBtn');

// Kiểm duyệt nội dung
const modPanel = document.getElementById('modPanel');
const modYourRole = document.getElementById('modYourRole');
const modList = document.getElementById('modList');
const modHistory = document.getElementById('modHistory');
const modOwnerBox = document.getElementById('modOwnerBox');
const modAddressInput = document.getElementById('modAddressInput');
const modAddBtn = document.getElementById('modAddBtn');
const modRemoveBtn = document.getElementById('modRemoveBtn');
const refreshModBtn = document.getElementById('refreshModBtn');

const SUBMIT_TEXT_CREATE = 'Đăng bài';
const SUBMIT_TEXT_EDIT = 'Lưu chỉnh sửa';

// Nạp contract BlogChain theo địa chỉ trong ô "Cài đặt nâng cao" (mặc định: địa chỉ trong contracts.json)
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
    contract = new ethers.Contract(address, ABI.BlogChain, readProvider);
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
    const [all, hiddenMap] = await Promise.all([
      Promise.all(Array.from({ length: count }, (_, k) => contract.getPost(count - 1 - k))),
      loadHiddenPosts(count),
    ]);

    const isHidden = (p) => hiddenMap.has(Number(p.id));
    const live = all.filter((p) => !p.deleted && !isHidden(p));
    const shown = showDeletedChk.checked ? all : live; // bài xóa mềm / bị ẩn chỉ hiện khi tick ô
    const deletedCount = all.filter((p) => p.deleted).length;
    const hiddenCount = all.filter((p) => !p.deleted && isHidden(p)).length;

    postCountDisplay.textContent = `${live.length} bài đang hiển thị (tổng đã đăng: ${count}, đã xóa mềm: ${deletedCount}` +
      (moderation ? `, bị quản trị viên ẩn: ${hiddenCount})` : ')');
    renderPosts(shown, hiddenMap);
    addLog(`Đọc thành công ${shown.length} bài viết từ Smart Contract.`, 'success');

    loadHistory(); // cập nhật bảng lịch sử giao dịch (không chờ)
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc dữ liệu từ Contract: ${errorReason(error)}`, 'error');
  }
}

// Hiển thị danh sách bài (dùng textContent để không chèn HTML từ nội dung bài)
function renderPosts(posts, hiddenMap = new Map()) {
  postsList.innerHTML = '';

  if (posts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'display-content';
    empty.textContent = 'Chưa có bài viết nào.';
    postsList.appendChild(empty);
    return;
  }

  for (const p of posts) {
    const hiddenBy = hiddenMap.get(Number(p.id));
    // Bài bị quản trị viên ẩn: người xem thường chỉ thấy thông báo + lý do, không thấy nội dung
    if (hiddenBy && !canModerate) {
      postsList.appendChild(hiddenPostCard(p, hiddenBy));
      continue;
    }

    const card = document.createElement('div');
    card.className = 'display-box post-card' + (p.deleted ? ' post-deleted' : '') + (hiddenBy ? ' post-hidden' : '');

    const title = document.createElement('div');
    title.className = 'post-title';
    title.textContent = `#${p.id} · ${p.title}`;
    if (p.deleted) {
      const badge = document.createElement('span');
      badge.className = 'badge-deleted';
      badge.textContent = 'ĐÃ XÓA MỀM';
      title.appendChild(badge);
    }
    if (hiddenBy) {
      const badge = document.createElement('span');
      badge.className = 'badge-hidden';
      badge.textContent = 'ĐÃ ẨN';
      title.appendChild(badge);
    }

    const meta = document.createElement('div');
    meta.className = 'display-label';
    const edited = p.updatedAt !== p.createdAt ? ` · sửa lúc ${formatTime(p.updatedAt)}` : '';
    meta.textContent = `${shortAddr(p.author)} · ${formatTime(p.createdAt)}${edited}`;

    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = p.content;

    card.append(title, meta);
    if (hiddenBy) card.appendChild(hiddenReasonLine(hiddenBy));
    card.appendChild(content);

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
      deleteBtn.addEventListener('click', () => deletePost(p.id, deleteBtn));

      actions.append(editBtn, deleteBtn);
    }

    // Quản trị viên: nút Ẩn bài (bài đang hiển thị) hoặc Hiện lại (bài đã ẩn)
    if (canModerate && !p.deleted) {
      const modBtn = document.createElement('button');
      modBtn.className = 'btn btn-outline btn-mod';
      modBtn.textContent = hiddenBy ? '👁️ Hiện lại' : '🚫 Ẩn bài';
      modBtn.addEventListener('click', () => (hiddenBy ? unhidePost(p.id, modBtn) : hidePost(p.id, modBtn)));
      actions.appendChild(modBtn);
    }

    card.appendChild(actions);
    postsList.appendChild(card);
  }
}

// ---------- Kiểm duyệt nội dung (contract BlogModeration) ----------

// Dòng "Bị ẩn bởi ... · Lý do: ..."
function hiddenReasonLine(info) {
  const line = document.createElement('div');
  line.className = 'hidden-reason';
  line.textContent = `Bị quản trị viên ${shortAddr(info.moderator)} ẩn lúc ${formatTime(info.at)}. Lý do: ${info.reason}`;
  return line;
}

// Thẻ thay thế cho bài bị ẩn (người xem thường): không hiện tiêu đề và nội dung
function hiddenPostCard(p, info) {
  const card = document.createElement('div');
  card.className = 'display-box post-card post-hidden';
  const title = document.createElement('div');
  title.className = 'post-title';
  title.textContent = `#${p.id} · Bài viết đã bị quản trị viên ẩn`;
  const badge = document.createElement('span');
  badge.className = 'badge-hidden';
  badge.textContent = 'ĐÃ ẨN';
  title.appendChild(badge);
  const meta = document.createElement('div');
  meta.className = 'display-label';
  meta.textContent = `Tác giả ${shortAddr(p.author)} · đăng lúc ${formatTime(p.createdAt)}`;
  card.append(title, meta, hiddenReasonLine(info));
  return card;
}

// Nạp contract kiểm duyệt (gọi khi mở trang, không cần ví). Chưa deploy thì blog chạy như cũ, không có nút Ẩn bài.
async function initModeration() {
  if (moderation || !contractAddress('BlogModeration')) return;
  try {
    const c = await loadReadContract('BlogModeration', 'kiểm duyệt (BlogModeration)');
    if (!c) return;
    const blogAddr = await c.blog();
    if (blogAddr.toLowerCase() !== contractAddress('BlogChain').toLowerCase()) {
      addLog('Contract kiểm duyệt trỏ tới một blog khác, bỏ qua.', 'warn');
      return;
    }
    moderation = c;
    modPanel.hidden = false;
    addLog('Đã nạp contract BlogModeration (kiểm duyệt nội dung).', 'success');
    if (userAccount) await refreshModRole(); // đã kết nối ví trước khi nạp xong → kiểm tra quyền ngay
    loadModeration(); // không chờ
  } catch (error) {
    console.error(error);
    addLog(`Không nạp được contract kiểm duyệt: ${errorReason(error)}`, 'error');
  }
}

// Bài nào đang bị ẩn: một lần gọi getHiddenFlags cho cả danh sách, lý do lấy từ sự kiện PostHidden.
// Trả về Map: id bài → { reason, moderator, at, txHash }
async function loadHiddenPosts(count) {
  const out = new Map();
  // Contract kiểm duyệt chỉ áp cho đúng contract blog mặc định (không áp khi tự nạp contract khác ở Cài đặt nâng cao)
  if (!moderation || count === 0 || String(contract.target).toLowerCase() !== contractAddress('BlogChain').toLowerCase()) return out;
  try {
    const flags = await moderation.getHiddenFlags(0, count);
    const ids = [];
    flags.forEach((f, i) => { if (f) ids.push(i); });
    if (ids.length === 0) return out;
    const evs = await queryLogs(moderation, moderation.filters.PostHidden(), deployBlockOf('BlogModeration'));
    for (const e of evs) { // sự kiện theo thứ tự thời gian → lần ẩn gần nhất ghi đè lần trước
      const id = Number(e.args.postId);
      if (ids.includes(id)) out.set(id, { reason: e.args.reason, moderator: e.args.moderator, at: Number(e.args.hiddenAt), txHash: e.transactionHash });
    }
    for (const id of ids) {
      if (!out.has(id)) out.set(id, { reason: '(chưa đọc được lý do)', moderator: ethers.ZeroAddress, at: 0, txHash: null });
    }
  } catch (error) {
    console.error(error);
    addLog(`Không đọc được danh sách bài bị ẩn: ${errorReason(error)}`, 'warn');
  }
  return out;
}

// Ví đang kết nối có quyền kiểm duyệt / là chủ sở hữu không → hiện nút Ẩn bài và ô thêm quản trị viên
async function refreshModRole() {
  canModerate = false;
  isModOwner = false;
  if (moderation && userAccount) {
    try {
      const [can, owner] = await Promise.all([moderation.canModerate(userAccount), moderation.owner()]);
      canModerate = can;
      isModOwner = owner.toLowerCase() === userAccount.toLowerCase();
    } catch (error) {
      console.error(error);
    }
  }
  modYourRole.textContent = !userAccount
    ? 'Kết nối ví để xem quyền của bạn.'
    : isModOwner
      ? 'Bạn là CHỦ SỞ HỮU: ẩn / hiện bài và thêm / bớt quản trị viên.'
      : canModerate
        ? 'Bạn là QUẢN TRỊ VIÊN: ẩn / hiện bài bằng nút trên từng bài viết.'
        : 'Ví của bạn không có quyền kiểm duyệt.';
  modOwnerBox.hidden = !isModOwner;
}

// Bảng quản trị viên + nhật ký kiểm duyệt (công khai: ai cũng xem được ai đã ẩn bài nào, lý do gì)
async function loadModeration() {
  if (!moderation) return;
  try {
    const from = deployBlockOf('BlogModeration');
    const [owner, ownerEvs, modEvs, hideEvs, unhideEvs] = await Promise.all([
      moderation.owner(),
      queryLogs(moderation, moderation.filters.OwnershipTransferred(), from),
      queryLogs(moderation, moderation.filters.ModeratorUpdated(), from),
      queryLogs(moderation, moderation.filters.PostHidden(), from),
      queryLogs(moderation, moderation.filters.PostUnhidden(), from),
    ]);

    // Danh sách quản trị viên hiện tại = áp lần lượt các sự kiện ModeratorUpdated
    const mods = new Map();
    for (const e of modEvs) mods.set(e.args.account.toLowerCase(), { addr: e.args.account, on: e.args.enabled });
    const list = [`${addrLabel(owner)} (chủ sở hữu)`];
    for (const m of mods.values()) {
      if (m.on && m.addr.toLowerCase() !== owner.toLowerCase()) list.push(addrLabel(m.addr));
    }
    modList.textContent = list.join(' · ');

    const rows = [
      ...ownerEvs.filter((e) => e.args.previousOwner !== ethers.ZeroAddress)
        .map((e) => ({ type: 'Chuyển chủ sở hữu', ev: e, who: e.args.previousOwner, what: `→ ${shortAddr(e.args.newOwner)}` })),
      ...modEvs.map((e) => ({ type: e.args.enabled ? 'Thêm quản trị viên' : 'Bớt quản trị viên', ev: e, who: e.args.by, what: shortAddr(e.args.account) })),
      ...hideEvs.map((e) => ({ type: 'Ẩn bài', ev: e, who: e.args.moderator, what: `#${e.args.postId} · Lý do: ${e.args.reason}`, when: Number(e.args.hiddenAt) })),
      ...unhideEvs.map((e) => ({ type: 'Hiện lại', ev: e, who: e.args.moderator, what: `#${e.args.postId}`, when: Number(e.args.unhiddenAt) })),
    ];
    rows.sort((a, b) => (b.ev.blockNumber - a.ev.blockNumber) || ((b.ev.index ?? 0) - (a.ev.index ?? 0)));
    for (const r of rows) {
      if (!r.when) r.when = await getBlockTime(r.ev.blockNumber);
    }

    modHistory.innerHTML = '';
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Chưa có hoạt động kiểm duyệt nào.';
      modHistory.appendChild(empty);
      return;
    }
    const table = document.createElement('table');
    table.className = 'history-table';
    const head = document.createElement('tr');
    for (const t of ['Việc', 'Nội dung', 'Người thực hiện', 'Thời gian', 'Mã giao dịch']) {
      const th = document.createElement('th');
      th.textContent = t;
      head.appendChild(th);
    }
    table.appendChild(head);
    for (const r of rows.slice(0, 100)) {
      const tr = document.createElement('tr');
      [r.type, r.what, addrLabel(r.who), formatTime(r.when)].forEach((c, i) => {
        const td = document.createElement('td');
        td.textContent = c;
        if (i === 1) td.className = 'note-cell';
        tr.appendChild(td);
      });
      const tdHash = document.createElement('td');
      tdHash.appendChild(txChip(r.ev.transactionHash));
      tr.appendChild(tdHash);
      table.appendChild(tr);
    }
    modHistory.appendChild(table);
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc nhật ký kiểm duyệt: ${errorReason(error)}`, 'error');
  }
}

// Ẩn một bài (quản trị viên), lý do ghi công khai trên blockchain. button = nút vừa bấm (để hiện "đang chờ")
async function hidePost(id, button = null) {
  const reason = (prompt(`Lý do ẩn bài #${id} (ghi công khai trên blockchain, tối đa 200 byte):`, 'Nội dung không phù hợp') || '').trim();
  if (!reason) return;
  if (byteLength(reason) > 200) {
    alert('Lý do tối đa 200 byte!');
    return;
  }
  const receipt = await runTx({
    label: `hidePost(${id}, "${reason}")`,
    button,
    successMessage: `Đã ẩn bài #${id}`,
    build: async (s) => {
      const c = moderation.connect(s);
      return c.hidePost(id, reason, await txOptions(c.hidePost, [id, reason]));
    },
  });
  if (receipt) await Promise.all([loadPosts(), loadModeration()]);
}

// Hiện lại một bài đã ẩn (quản trị viên)
async function unhidePost(id, button = null) {
  if (!confirm(`Hiện lại bài #${id} cho mọi người xem?`)) return;
  const receipt = await runTx({
    label: `unhidePost(${id})`,
    button,
    successMessage: `Đã hiện lại bài #${id}`,
    build: async (s) => {
      const c = moderation.connect(s);
      return c.unhidePost(id, await txOptions(c.unhidePost, [id]));
    },
  });
  if (receipt) await Promise.all([loadPosts(), loadModeration()]);
}

// Thêm / bớt quản trị viên (chỉ chủ sở hữu)
async function setModerator(enabled) {
  const addr = modAddressInput.value.trim();
  if (!ethers.isAddress(addr)) {
    alert('Địa chỉ ví không đúng định dạng (0x...)');
    return;
  }
  const label = enabled ? 'thêm' : 'bớt';
  const receipt = await runTx({
    label: `setModerator(${shortAddr(addr)}, ${enabled})`,
    button: enabled ? modAddBtn : modRemoveBtn,
    successMessage: `Đã ${label} quản trị viên ${shortAddr(addr)}`,
    build: async (s) => {
      const c = moderation.connect(s);
      return c.setModerator(addr, enabled, await txOptions(c.setModerator, [addr, enabled]));
    },
  });
  if (!receipt) return;
  modAddressInput.value = '';
  loadModeration();
}

// ---------- Chi tiết bài viết & lịch sử giao dịch ----------


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
      queryLogs(contract, contract.filters.PostCreated(id), deployBlockOf('BlogChain')),
      queryLogs(contract, contract.filters.PostEdited(id), deployBlockOf('BlogChain')),
      queryLogs(contract, contract.filters.PostDeleted(id), deployBlockOf('BlogChain')),
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
  if (!contract) return;
  try {
    const [created, edited, deleted] = await Promise.all([
      queryLogs(contract, contract.filters.PostCreated(), deployBlockOf('BlogChain')),
      queryLogs(contract, contract.filters.PostEdited(), deployBlockOf('BlogChain')),
      queryLogs(contract, contract.filters.PostDeleted(), deployBlockOf('BlogChain')),
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
  postTitleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  postTitleInput.focus({ preventScroll: true });
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

// Đăng bài mới / Lưu chỉnh sửa (cần ký bằng MetaMask, tốn phí gas)
async function submitPost() {
  if (!contract) {
    addLog('Chưa nạp được contract BlogChain. Hãy kiểm tra địa chỉ trong mục "Cài đặt nâng cao".', 'warn');
    return;
  }

  const title = postTitleInput.value.trim();
  const content = postContentInput.value.trim();
  if (!title || !content) {
    alert('Vui lòng nhập đầy đủ tiêu đề và nội dung!');
    return;
  }

  // Giới hạn tính theo byte giống trong contract (tiếng Việt có dấu chiếm nhiều byte hơn 1 ký tự)
  if (byteLength(title) > 100 || byteLength(content) > 2000) {
    alert('Tiêu đề tối đa 100 byte, nội dung tối đa 2000 byte!');
    return;
  }

  const id = editingPostId;
  const receipt = await runTx(id === null
    ? {
      label: `createPost("${title}")`,
      button: submitPostBtn,
      successMessage: `Đã đăng bài "${title}"`,
      build: async (s) => {
        const c = contract.connect(s);
        return c.createPost(title, content, await txOptions(c.createPost, [title, content]));
      },
    }
    : {
      label: `editPost(${id}, "${title}")`,
      button: submitPostBtn,
      successMessage: `Đã lưu chỉnh sửa bài #${id}`,
      build: async (s) => {
        const c = contract.connect(s);
        return c.editPost(id, title, content, await txOptions(c.editPost, [id, title, content]));
      },
    });
  if (!receipt) return;
  resetForm();
  await loadPosts();
}

// Xóa bài (xóa mềm, chỉ tác giả). button = nút vừa bấm (để hiện "đang chờ")
async function deletePost(id, button = null) {
  if (!confirm(`Xóa bài #${id}? Dữ liệu cũ vẫn còn trong lịch sử blockchain.`)) return;
  const receipt = await runTx({
    label: `deletePost(${id})`,
    button,
    successMessage: `Đã xóa bài #${id}`,
    build: async (s) => {
      const c = contract.connect(s);
      return c.deletePost(id, await txOptions(c.deletePost, [id]));
    },
  });
  if (!receipt) return;
  if (editingPostId !== null && editingPostId === id) resetForm();
  await loadPosts();
}

loadContractBtn.addEventListener('click', loadContract);
refreshPostsBtn.addEventListener('click', loadPosts);
showDeletedChk.addEventListener('change', loadPosts);
refreshHistoryBtn.addEventListener('click', loadHistory);
detailCloseBtn.addEventListener('click', closeDetail);
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetail(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
submitPostBtn.addEventListener('click', submitPost);
cancelEditBtn.addEventListener('click', resetForm);
modAddBtn.addEventListener('click', () => setModerator(true));
modRemoveBtn.addEventListener('click', () => setModerator(false));
refreshModBtn.addEventListener('click', loadModeration);

// ---------- Đăng ký module với lõi (xem core.js) ----------
registerModule({
  name: 'Blog',
  // Nạp contract kiểm duyệt TRƯỚC blog để bài bị ẩn không hiện ra trong giây lát
  init: async () => {
    if (contractAddress('BlogChain')) contractAddressInput.value = contractAddress('BlogChain');
    await initModeration();
    if (contractAddress('BlogChain')) await loadContract();
  },
  onWalletChanged: async () => {
    resetForm();
    await refreshModRole(); // kiểm tra quyền quản trị trước để hiện nút Ẩn bài nếu ví là quản trị viên
    if (contract) loadPosts(); // vẽ lại nút Sửa/Xóa cho bài của mình
    if (moderation) loadModeration(); // nhãn "(bạn)" trong danh sách quản trị viên
  },
  onReadProviderChanged: () => {
    if (contract) contract = contract.connect(readProvider);
    if (moderation) moderation = moderation.connect(readProvider);
  },
  poll: async (from, latest) => {
    const [postEvs, modEvs] = await Promise.all([
      contract ? contract.queryFilter('*', from, latest) : [],
      moderation ? moderation.queryFilter('*', from, latest) : [],
    ]);
    for (const e of postEvs) {
      const a = e.args;
      if (e.eventName === 'PostCreated') logEvent(e, `Bài #${a.id} "${a.title}" được đăng bởi ${shortAddr(a.author)}`);
      if (e.eventName === 'PostEdited') logEvent(e, `Bài #${a.id} được sửa bởi ${shortAddr(a.author)}`);
      if (e.eventName === 'PostDeleted') logEvent(e, `Bài #${a.id} bị xóa bởi ${shortAddr(a.author)}`);
    }
    for (const e of modEvs) {
      const a = e.args;
      if (e.eventName === 'PostHidden') logEvent(e, `Bài #${a.postId} bị ẩn bởi ${shortAddr(a.moderator)}. Lý do: ${a.reason}`);
      if (e.eventName === 'PostUnhidden') logEvent(e, `Bài #${a.postId} được hiện lại bởi ${shortAddr(a.moderator)}`);
      if (e.eventName === 'ModeratorUpdated') logEvent(e, `${shortAddr(a.account)} ${a.enabled ? 'trở thành' : 'thôi làm'} quản trị viên`);
      if (e.eventName === 'OwnershipTransferred') logEvent(e, `Chủ sở hữu mới: ${shortAddr(a.newOwner)}`);
    }
    if (modEvs.some((e) => e.eventName === 'ModeratorUpdated' || e.eventName === 'OwnershipTransferred')) await refreshModRole();
    if (modEvs.length) loadModeration();
    if ((postEvs.length || modEvs.length) && contract) loadPosts();
  },
  describeTx: (tx, contractName) => {
    if (contractName === 'BlogChain') return { kind: 'Thao tác blog (BlogChain)' };
    if (contractName === 'BlogModeration') return { kind: 'Kiểm duyệt nội dung (BlogModeration)' };
    return null;
  },
});

addErrorHints([
  ['only the author', 'tài khoản đang chọn không phải tác giả của bài này.'],
  ['post is deleted', 'bài viết này đã bị xóa.'],
  ['only moderators', 'tài khoản đang chọn không phải quản trị viên.'],
  ['only the owner', 'chỉ chủ sở hữu (giảng viên) mới thêm / bớt được quản trị viên.'],
  ['already hidden', 'bài này đã bị ẩn từ trước.'],
  ['no change', 'ví này đã ở đúng trạng thái đó rồi (đã là / chưa là quản trị viên).'],
]);

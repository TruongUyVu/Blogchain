/*
 * transfer.js – module "Chuyển tiền" (thẻ Chuyển tiền, contract Payments).
 * Chuyển ETH sang ví khác kèm ghi chú; bảng lịch sử đọc từ sự kiện Transferred.
 */
let payments = null; // contract Payments

const transferToInput = document.getElementById('transferToInput');
const transferAmountInput = document.getElementById('transferAmountInput');
const transferNoteInput = document.getElementById('transferNoteInput');
const sendTransferBtn = document.getElementById('sendTransferBtn');
const transfersList = document.getElementById('transfersList');
const myTransfersChk = document.getElementById('myTransfersChk');
const refreshTransfersBtn = document.getElementById('refreshTransfersBtn');

// Nạp contract Payments (gọi khi mở trang, không cần ví)
async function initPayments() {
  if (payments) return;
  if (!contractAddress('Payments')) {
    transfersList.innerHTML = `<div class="display-content">Contract Payments chưa được deploy trên mạng ${NET.label}.</div>`;
    return;
  }
  // Gắn với readProvider để đọc; khi chuyển tiền thì dùng payments.connect(signer)
  payments = await loadReadContract('Payments');
  if (!payments) return;
  addLog('Đã nạp contract Payments (chuyển tiền).', 'success');
}

// Chuyển ETH qua contract Payments (cần ký bằng MetaMask, tốn phí gas)
async function sendTransfer() {
  if (!payments) {
    addLog(`Chưa nạp được contract Payments trên mạng ${NET.label}.`, 'warn');
    return;
  }
  if (!(await ensureWallet())) return; // cần biết ví mình để chặn tự chuyển cho chính mình

  const to = transferToInput.value.trim();
  const amountText = transferAmountInput.value.trim().replace(',', '.');
  const note = transferNoteInput.value.trim();

  if (!ethers.isAddress(to)) {
    alert('Địa chỉ ví người nhận không hợp lệ (0x...)');
    return;
  }
  if (isMe(to)) {
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
  if (byteLength(note) > 200) {
    alert('Ghi chú tối đa 200 byte!');
    return;
  }
  if (!confirm(`Chuyển ${formatEth(value)} tới ${to}?\nGiao dịch trên blockchain không thể hoàn tác.`)) return;

  const receipt = await runTx({
    label: `sendEth(${shortAddr(to)}) kèm ${formatEth(value)}`,
    button: sendTransferBtn,
    successMessage: `Đã chuyển ${formatEth(value)} tới ${shortAddr(to)}`,
    build: async (s) => {
      const p = payments.connect(s);
      return p.sendEth(to, note, await txOptions(p.sendEth, [to, note], { value }));
    },
  });
  if (!receipt) return;
  transferAmountInput.value = '';
  transferNoteInput.value = '';
  await loadTransfers();
}

// ---------- Phát ETH cho nhiều ví (contract MultiSend) ----------
let multiSend = null; // contract MultiSend
const MAX_MULTI_RECIPIENTS = 100; // giống MAX_RECIPIENTS trong contract

const multiSendCard = document.getElementById('multiSendCard');
const multiAddressesInput = document.getElementById('multiAddressesInput');
const multiAmountInput = document.getElementById('multiAmountInput');
const multiNoteInput = document.getElementById('multiNoteInput');
const multiSummary = document.getElementById('multiSummary');
const multiSendBtn = document.getElementById('multiSendBtn');

async function initMultiSend() {
  if (multiSend || !contractAddress('MultiSend')) return;
  multiSend = await loadReadContract('MultiSend');
  if (!multiSend) return;
  multiSendCard.hidden = false;
  addLog('Đã nạp contract MultiSend (phát ETH cho nhiều ví).', 'success');
}

// Đọc ô danh sách ví: tách theo xuống dòng / dấu phẩy / khoảng trắng, bỏ trùng.
// Trả về { valid: [địa chỉ], invalid: [chuỗi sai], self: true nếu có ví của chính mình, amount (wei) hoặc null }
function parseMultiForm() {
  const seen = new Set();
  const valid = [];
  const invalid = [];
  let self = false;
  for (const raw of multiAddressesInput.value.split(/[\s,;]+/).filter(Boolean)) {
    if (!ethers.isAddress(raw)) {
      invalid.push(raw);
      continue;
    }
    const addr = ethers.getAddress(raw.toLowerCase()); // chuẩn hóa chữ hoa / thường
    if (isMe(addr)) {
      self = true;
      continue;
    }
    if (seen.has(addr)) continue;
    seen.add(addr);
    valid.push(addr);
  }
  let amount = null;
  try {
    const a = ethers.parseEther(multiAmountInput.value.trim().replace(',', '.'));
    if (a > 0n) amount = a;
  } catch {}
  return { valid, invalid, self, amount };
}

// Dòng tóm tắt cập nhật ngay khi gõ: bao nhiêu ví hợp lệ, tổng tiền, địa chỉ nào sai
function updateMultiSummary() {
  const { valid, invalid, self, amount } = parseMultiForm();
  const parts = [`<strong>${valid.length}</strong> ví hợp lệ`];
  if (amount !== null && valid.length) parts.push(`tổng <strong>${formatEth(amount * BigInt(valid.length))}</strong>`);
  const problems = [];
  if (invalid.length) problems.push(`${invalid.length} địa chỉ không hợp lệ: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}`);
  if (valid.length > MAX_MULTI_RECIPIENTS) problems.push(`tối đa ${MAX_MULTI_RECIPIENTS} ví mỗi lần`);
  if (self) problems.push('đã bỏ ví của chính bạn');
  multiSummary.textContent = '';
  multiSummary.insertAdjacentHTML('beforeend', parts.join(' · ')); // chỉ chứa số do trang tự tính
  if (problems.length) {
    multiSummary.append(' · ');
    const warn = document.createElement('span');
    warn.textContent = problems.join(' · '); // chuỗi người dùng nhập: dùng textContent
    multiSummary.appendChild(warn);
  }
  multiSummary.classList.toggle('has-error', invalid.length > 0 || valid.length > MAX_MULTI_RECIPIENTS);
}

async function sendMulti() {
  if (!multiSend) return;
  if (!(await ensureWallet())) return; // cần biết ví mình để bỏ khỏi danh sách
  const { valid, invalid, amount } = parseMultiForm();
  const note = multiNoteInput.value.trim();
  if (invalid.length) {
    alert(`Có ${invalid.length} địa chỉ không hợp lệ, hãy sửa trước:\n${invalid.slice(0, 10).join('\n')}`);
    return;
  }
  if (valid.length === 0) {
    alert('Chưa có ví nhận hợp lệ nào.');
    return;
  }
  if (valid.length > MAX_MULTI_RECIPIENTS) {
    alert(`Tối đa ${MAX_MULTI_RECIPIENTS} ví mỗi lần, hãy chia thành nhiều lần.`);
    return;
  }
  if (amount === null) {
    alert('Số tiền mỗi ví không hợp lệ. Ví dụ: 0.001');
    return;
  }
  if (byteLength(note) > 200) {
    alert('Ghi chú tối đa 200 byte!');
    return;
  }
  const total = amount * BigInt(valid.length);
  if (!confirm(`Phát ${formatEth(amount)} cho mỗi ví, ${valid.length} ví, tổng ${formatEth(total)} (chưa tính phí gas)?\nGiao dịch trên blockchain không thể hoàn tác.`)) return;

  const receipt = await runTx({
    label: `sendEach(${valid.length} ví × ${formatEth(amount)})`,
    button: multiSendBtn,
    successMessage: `Đã phát ${formatEth(amount)} cho ${valid.length} ví (tổng ${formatEth(total)})`,
    build: async (s) => {
      const c = multiSend.connect(s);
      return c.sendEach(valid, amount, note, await txOptions(c.sendEach, [valid, amount, note], { value: total }));
    },
  });
  if (!receipt) return;
  multiAddressesInput.value = '';
  multiNoteInput.value = '';
  updateMultiSummary();
  await loadTransfers();
}

// ---------- Lịch sử chuyển tiền: gộp Payments (từng giao dịch) + MultiSend (từng ví trong mỗi lô) ----------
async function loadTransferRows() {
  const [single, batchItems, batches] = await Promise.all([
    payments ? queryLogs(payments, payments.filters.Transferred(), deployBlockOf('Payments')) : [],
    multiSend ? queryLogs(multiSend, multiSend.filters.BatchTransfer(), deployBlockOf('MultiSend')) : [],
    multiSend ? queryLogs(multiSend, multiSend.filters.BatchSent(), deployBlockOf('MultiSend')) : [],
  ]);
  const batchInfo = new Map(batches.map((b) => [String(b.args.batchId), b.args]));
  return [
    ...single.map((e) => ({ ev: e, id: `#${e.args.id}`, from: e.args.from, to: e.args.to, amount: e.args.amount, note: e.args.note, at: e.args.sentAt })),
    ...batchItems.map((e) => {
      const b = batchInfo.get(String(e.args.batchId));
      return { ev: e, id: `Lô ${e.args.batchId}`, from: e.args.from, to: e.args.to, amount: e.args.amount, note: b ? b.note : '', at: b ? b.sentAt : 0 };
    }),
  ];
}

// Bảng lịch sử chuyển tiền lấy từ sự kiện trên chuỗi
async function loadTransfers() {
  if (!payments && !multiSend) return;
  try {
    let rows = await loadTransferRows();
    if (myTransfersChk.checked && !userAccount) {
      addLog('Hãy kết nối ví MetaMask để lọc giao dịch của ví bạn.', 'warn');
      myTransfersChk.checked = false;
    }
    if (myTransfersChk.checked && userAccount) rows = rows.filter((r) => isMe(r.from) || isMe(r.to));
    rows.sort((a, b) => newestFirst(a.ev, b.ev));
    for (const r of rows) {
      if (!r.at) r.at = await getBlockTime(r.ev.blockNumber);
    }

    transfersList.innerHTML = '';
    if (rows.length === 0) {
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

    for (const r of rows.slice(0, 200)) {
      const tr = document.createElement('tr');
      const cells = [r.id, formatTime(r.at), addrLabel(r.from), addrLabel(r.to), formatEth(r.amount), r.note || '—'];
      cells.forEach((c, i) => {
        const td = document.createElement('td');
        td.textContent = c;
        if (i === 2) td.title = r.from;
        if (i === 3) td.title = r.to;
        if (i === 4) td.className = 'amount-cell';
        if (i === 5) td.className = 'note-cell';
        tr.appendChild(td);
      });
      const tdHash = document.createElement('td');
      tdHash.appendChild(txChip(r.ev.transactionHash));
      tr.appendChild(tdHash);
      table.appendChild(tr);
    }
    transfersList.appendChild(table);
  } catch (error) {
    console.error(error);
    addLog(`Lỗi khi đọc lịch sử chuyển tiền: ${errorReason(error)}`, 'error');
  }
}

sendTransferBtn.addEventListener('click', sendTransfer);
refreshTransfersBtn.addEventListener('click', loadTransfers);
myTransfersChk.addEventListener('change', loadTransfers);
multiSendBtn.addEventListener('click', sendMulti);
for (const el of [multiAddressesInput, multiAmountInput]) el.addEventListener('input', updateMultiSummary);
// ---------- Đăng ký module với lõi (xem core.js) ----------
registerModule({
  name: 'Chuyển tiền',
  // Nạp Payments và MultiSend cùng lúc, xong mới vẽ lịch sử (gộp cả hai)
  init: async () => {
    await Promise.all([initPayments(), initMultiSend()]);
    await loadTransfers();
  },
  onWalletChanged: () => {
    loadTransfers(); // nhãn "(bạn)" và bộ lọc "giao dịch của tôi"
    updateMultiSummary(); // bỏ ví của chính mình khỏi danh sách phát
  },
  onReadProviderChanged: () => {
    if (payments) payments = payments.connect(readProvider);
    if (multiSend) multiSend = multiSend.connect(readProvider);
  },
  poll: async (from, latest) => {
    const [single, batches] = await Promise.all([
      payments ? payments.queryFilter(payments.filters.Transferred(), from, latest) : [],
      multiSend ? multiSend.queryFilter(multiSend.filters.BatchSent(), from, latest) : [],
    ]);
    for (const e of single) logEvent(e, `${shortAddr(e.args.from)} → ${shortAddr(e.args.to)}: ${formatEth(e.args.amount)}`);
    for (const e of batches) logEvent(e, `${shortAddr(e.args.from)} phát ${formatEth(e.args.amountEach)} cho ${e.args.recipients} ví (lô ${e.args.batchId})`);
    if (single.length || batches.length) loadTransfers();
  },
  // Thẻ Tra cứu: giải thích giao dịch gửi tới Payments / MultiSend từ dữ liệu gọi hàm
  describeTx: (tx, contractName) => {
    if (contractName === 'Payments' && payments) {
      const parsed = payments.interface.parseTransaction({ data: tx.data, value: tx.value });
      if (parsed) return { kind: 'Chuyển tiền qua contract Payments', to: parsed.args[0], note: parsed.args[1] };
    }
    if (contractName === 'MultiSend' && multiSend) {
      const parsed = multiSend.interface.parseTransaction({ data: tx.data, value: tx.value });
      if (parsed) {
        return {
          kind: `Phát ETH cho ${parsed.args[0].length} ví, mỗi ví ${formatEth(parsed.args[1])} (MultiSend)`,
          to: `${parsed.args[0].length} ví: ${parsed.args[0].slice(0, 5).map(shortAddr).join(', ')}${parsed.args[0].length > 5 ? '...' : ''}`,
          note: parsed.args[2],
        };
      }
    }
    return null;
  },
});

addErrorHints([
  ['cannot send to yourself', 'không thể tự chuyển cho chính mình.'],
  ['note is too long', 'ghi chú tối đa 200 byte.'],
  ['wrong total amount', 'tổng tiền gửi kèm phải đúng bằng số tiền mỗi ví × số ví.'],
  ['too many recipients', 'tối đa 100 ví mỗi lần phát.'],
  ['invalid recipient', 'có địa chỉ ví nhận không hợp lệ.'],
]);

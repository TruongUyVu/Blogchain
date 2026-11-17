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
  await loadTransfers();
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

// Bảng lịch sử chuyển tiền lấy từ sự kiện Transferred trên chuỗi
async function loadTransfers() {
  if (!payments) return;
  try {
    let events = await queryLogs(payments, payments.filters.Transferred(), deployBlockOf('Payments'));
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

sendTransferBtn.addEventListener('click', sendTransfer);
refreshTransfersBtn.addEventListener('click', loadTransfers);
myTransfersChk.addEventListener('change', loadTransfers);

// ---------- Đăng ký module với lõi (xem core.js) ----------
registerModule({
  name: 'Chuyển tiền',
  init: initPayments,
  onWalletChanged: () => { if (payments) loadTransfers(); }, // nhãn "(bạn)" và bộ lọc "giao dịch của tôi"
  onReadProviderChanged: () => {
    if (payments) payments = payments.connect(readProvider);
  },
  poll: async (from, latest) => {
    if (!payments) return;
    const evs = await payments.queryFilter(payments.filters.Transferred(), from, latest);
    for (const e of evs) logEvent(e, `${shortAddr(e.args.from)} → ${shortAddr(e.args.to)}: ${formatEth(e.args.amount)}`);
    if (evs.length) loadTransfers();
  },
  // Thẻ Tra cứu: giao dịch gửi tới Payments thì lấy người nhận thật + ghi chú từ dữ liệu gọi hàm
  describeTx: (tx, contractName) => {
    if (contractName !== 'Payments' || !payments) return null;
    const parsed = payments.interface.parseTransaction({ data: tx.data, value: tx.value });
    if (!parsed) return null;
    return { kind: 'Chuyển tiền qua contract Payments', to: parsed.args[0], note: parsed.args[1] };
  },
});

addErrorHints([
  ['cannot send to yourself', 'không thể tự chuyển cho chính mình.'],
  ['note is too long', 'ghi chú tối đa 200 byte.'],
]);
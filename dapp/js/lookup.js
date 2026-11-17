/*
 * lookup.js – module "Tra cứu": xem chi tiết một giao dịch bất kỳ theo mã (TX hash).
 * Giao dịch gửi tới contract có trong contracts.json được nhận ra tự động (tên contract + tên hàm);
 * module nào muốn giải thích kỹ hơn thì khai báo describeTx(tx, tênContract) khi registerModule.
 */
const txLookupInput = document.getElementById('txLookupInput');
const txLookupBtn = document.getElementById('txLookupBtn');
const txLookupResult = document.getElementById('txLookupResult');

// Mở thẻ Tra cứu và tra ngay một mã giao dịch (txChip trong core.js gọi hàm này)
function openTxLookup(hash) {
  txLookupInput.value = hash;
  showTab('lookup');
  lookupTx();
}

// Giao dịch gửi tới contract nào của DApp, gọi hàm gì → { kind, to, note } (note = null nếu không có)
function describeKnownTx(tx) {
  const target = (tx.to || '').toLowerCase();
  const name = Object.keys(DEPLOYED).find((n) => contractAddress(n).toLowerCase() === target);
  if (!name) return null;
  for (const m of MODULES) {
    if (typeof m.describeTx !== 'function') continue;
    try {
      const d = m.describeTx(tx, name);
      if (d) return { to: tx.to, note: null, ...d };
    } catch (e) {
      console.warn('describeTx', m.name, e);
    }
  }
  let fn = '';
  try {
    const parsed = ABI[name] ? new ethers.Interface(ABI[name]).parseTransaction({ data: tx.data, value: tx.value }) : null;
    if (parsed) fn = ` · hàm ${parsed.name}()`;
  } catch {}
  return { kind: `Gọi contract ${name}${fn}`, to: tx.to, note: null };
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

    // Đoán loại giao dịch: contract của DApp (module giải thích thêm nếu có), deploy, hay chuyển ETH ví → ví
    let kind = tx.data && tx.data !== '0x' ? 'Gọi smart contract' : 'Chuyển ETH trực tiếp (ví → ví)';
    let to = tx.to;
    let note = null;
    const known = tx.to ? describeKnownTx(tx) : null;
    if (known) ({ kind, to, note } = known);
    else if (!tx.to) kind = 'Deploy smart contract';

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

txLookupBtn.addEventListener('click', lookupTx);
txLookupInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookupTx(); });

registerModule({ name: 'Tra cứu' }); // không có contract riêng; đăng ký để lõi biết module có mặt
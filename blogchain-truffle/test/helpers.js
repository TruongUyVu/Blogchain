/**
 * Hàm hỗ trợ dùng chung cho các file test (Truffle + Ganache).
 *   const { expectRevert, increaseTime, txCost, balanceOf, ether } = require("./helpers");
 */

// Giao dịch phải bị revert và thông báo lỗi chứa chuỗi mong đợi (lý do trong require(..., "...") của contract)
async function expectRevert(promise, expectedMessage) {
  let reverted = false;
  try {
    await promise;
  } catch (err) {
    reverted = true;
    assert.include(
      err.message,
      expectedMessage,
      `Mong đợi lỗi chứa "${expectedMessage}" nhưng nhận được: ${err.message}`
    );
  }
  assert.isTrue(reverted, "Giao dịch lẽ ra phải bị revert");
}

// Gửi một lệnh JSON-RPC tới Ganache (các lệnh evm_* chỉ có trên chuỗi thử, không có trên Sepolia)
function rpc(method, params = []) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({ jsonrpc: "2.0", id: Date.now(), method, params }, (err, res) =>
      err ? reject(err) : res.error ? reject(new Error(res.error.message)) : resolve(res.result)
    );
  });
}

// "Tua nhanh" thời gian của chuỗi thử thêm `seconds` giây rồi đào 1 block mới để block.timestamp tăng theo.
// Dùng để test chức năng có thời hạn (ví dụ khoản vay quá hạn) mà không phải chờ thật.
async function increaseTime(seconds) {
  await rpc("evm_increaseTime", [Number(seconds)]);
  await rpc("evm_mine");
}

// Timestamp (giây) của block mới nhất
async function latestTime() {
  return Number((await web3.eth.getBlock("latest")).timestamp);
}

// Phí gas (wei, BigInt) mà người gửi đã trả cho một giao dịch Truffle: gasUsed × giá gas thực tế
async function txCost(result) {
  const receipt = result.receipt;
  const price = receipt.effectiveGasPrice ?? (await web3.eth.getTransaction(result.tx)).gasPrice;
  return BigInt(receipt.gasUsed) * BigInt(price);
}

// Số dư (wei, BigInt) của một địa chỉ
async function balanceOf(address) {
  return BigInt(await web3.eth.getBalance(address));
}

// "0.01" ETH → wei (chuỗi, dùng làm value cho giao dịch Truffle)
function ether(amount) {
  return web3.utils.toWei(String(amount), "ether");
}

module.exports = { expectRevert, rpc, increaseTime, latestTime, txCost, balanceOf, ether };

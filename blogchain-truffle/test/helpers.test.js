const { increaseTime, latestTime, balanceOf, txCost, ether } = require("./helpers");

// Kiểm tra chính các hàm hỗ trợ (để test của chức năng có thời hạn như cho vay P2P tin cậy được)
contract("Hàm hỗ trợ test", (accounts) => {
  const [alice, bob] = accounts;

  it("increaseTime tua nhanh thời gian của chuỗi thử", async () => {
    const before = await latestTime();
    await increaseTime(3 * 24 * 3600); // 3 ngày
    const after = await latestTime();
    assert.isAtLeast(after - before, 3 * 24 * 3600);
  });

  it("txCost + balanceOf tính đúng số dư sau khi chuyển ETH", async () => {
    const start = await balanceOf(alice);
    const result = await web3.eth.sendTransaction({ from: alice, to: bob, value: ether("0.5") });
    const cost = await txCost({ receipt: result, tx: result.transactionHash });
    assert.equal((await balanceOf(alice)).toString(), (start - BigInt(ether("0.5")) - cost).toString());
  });
});

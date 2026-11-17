const Payments = artifacts.require("Payments");

const { expectRevert } = require("./helpers");

contract("Payments", (accounts) => {
  const [alice, bob] = accounts; // alice = người gửi, bob = người nhận
  const ONE_ETH = web3.utils.toWei("1", "ether");
  let pay;

  // Mỗi test chạy trên một contract mới tinh
  beforeEach(async () => {
    pay = await Payments.new();
  });

  it("chuyển ETH thành công: người nhận nhận đủ tiền, contract không giữ lại gì", async () => {
    const bobBefore = web3.utils.toBN(await web3.eth.getBalance(bob));

    await pay.sendEth(bob, "Tra tien an trua", { from: alice, value: ONE_ETH });

    const bobAfter = web3.utils.toBN(await web3.eth.getBalance(bob));
    assert.equal(bobAfter.sub(bobBefore).toString(), ONE_ETH);
    assert.equal(await web3.eth.getBalance(pay.address), "0");
  });

  it("phát sự kiện Transferred đúng thông tin và tăng transferCount", async () => {
    const tx = await pay.sendEth(bob, "Lan 1", { from: alice, value: ONE_ETH });

    const log = tx.logs[0];
    assert.equal(log.event, "Transferred");
    assert.equal(log.args.id.toNumber(), 0);
    assert.equal(log.args.from, alice);
    assert.equal(log.args.to, bob);
    assert.equal(log.args.amount.toString(), ONE_ETH);
    assert.equal(log.args.note, "Lan 1");

    await pay.sendEth(bob, "Lan 2", { from: alice, value: ONE_ETH });
    assert.equal((await pay.transferCount()).toNumber(), 2);
  });

  it("không cho chuyển 0 ETH", async () => {
    await expectRevert(pay.sendEth(bob, "", { from: alice, value: 0 }), "Amount must be greater than 0");
  });

  it("không cho tự chuyển cho chính mình", async () => {
    await expectRevert(pay.sendEth(alice, "", { from: alice, value: ONE_ETH }), "Cannot send to yourself");
  });

  it("không cho chuyển tới địa chỉ 0x000...000", async () => {
    const zero = "0x0000000000000000000000000000000000000000";
    await expectRevert(pay.sendEth(zero, "", { from: alice, value: ONE_ETH }), "Invalid recipient");
  });

  it("không cho ghi chú dài quá 200 byte", async () => {
    await expectRevert(pay.sendEth(bob, "a".repeat(201), { from: alice, value: ONE_ETH }), "Note is too long");
  });
});

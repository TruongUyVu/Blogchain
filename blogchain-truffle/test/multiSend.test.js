const MultiSend = artifacts.require("MultiSend");
const { expectRevert, balanceOf, ether } = require("./helpers");

contract("MultiSend", (accounts) => {
  const [teacher, s1, s2, s3] = accounts; // giảng viên phát ETH cho 3 sinh viên
  const EACH = ether("0.01");
  let ms;

  beforeEach(async () => {
    ms = await MultiSend.new();
  });

  it("mỗi ví nhận đủ số tiền, contract không giữ lại gì", async () => {
    const before = await Promise.all([s1, s2, s3].map(balanceOf));
    await ms.sendEach([s1, s2, s3], EACH, "Phat ETH lop FinTech", { from: teacher, value: ether("0.03") });
    const after = await Promise.all([s1, s2, s3].map(balanceOf));
    for (let k = 0; k < 3; k++) assert.equal((after[k] - before[k]).toString(), EACH);
    assert.equal(await web3.eth.getBalance(ms.address), "0");
  });

  it("phát sự kiện BatchSent (một lần) và BatchTransfer (mỗi ví), tăng batchCount", async () => {
    const tx = await ms.sendEach([s1, s2], EACH, "Lo 1", { from: teacher, value: ether("0.02") });
    const sent = tx.logs.filter((l) => l.event === "BatchSent");
    const each = tx.logs.filter((l) => l.event === "BatchTransfer");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].args.recipients.toNumber(), 2);
    assert.equal(sent[0].args.note, "Lo 1");
    assert.equal(each.length, 2);
    assert.deepEqual(each.map((l) => l.args.to), [s1, s2]);
    assert.equal((await ms.batchCount()).toNumber(), 1);
  });

  it("tổng tiền gửi kèm phải đúng bằng số tiền mỗi ví × số ví", async () => {
    await expectRevert(ms.sendEach([s1, s2], EACH, "", { from: teacher, value: ether("0.01") }), "Wrong total amount");
    await expectRevert(ms.sendEach([s1, s2], EACH, "", { from: teacher, value: ether("0.03") }), "Wrong total amount");
  });

  it("từ chối danh sách rỗng, số tiền 0, quá 100 ví, ghi chú quá 200 byte", async () => {
    await expectRevert(ms.sendEach([], EACH, "", { from: teacher }), "No recipients");
    await expectRevert(ms.sendEach([s1], 0, "", { from: teacher }), "Amount must be greater than 0");
    const many = Array(101).fill(s1);
    await expectRevert(ms.sendEach(many, 1, "", { from: teacher, value: 101 }), "Too many recipients");
    await expectRevert(ms.sendEach([s1], EACH, "a".repeat(201), { from: teacher, value: EACH }), "Note is too long");
  });

  it("một địa chỉ sai (0x0 hoặc chính mình) thì hủy cả lô, không ai nhận được tiền", async () => {
    const before = await balanceOf(s1);
    await expectRevert(
      ms.sendEach([s1, "0x0000000000000000000000000000000000000000"], EACH, "", { from: teacher, value: ether("0.02") }),
      "Invalid recipient"
    );
    await expectRevert(ms.sendEach([s1, teacher], EACH, "", { from: teacher, value: ether("0.02") }), "Cannot send to yourself");
    assert.equal((await balanceOf(s1)).toString(), before.toString());
    assert.equal((await ms.batchCount()).toNumber(), 0);
  });
});

const DocumentRegistry = artifacts.require("DocumentRegistry");

// Hàm hỗ trợ: giao dịch phải bị revert và thông báo lỗi chứa chuỗi mong đợi
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

contract("DocumentRegistry", (accounts) => {
  const [alice, bob] = accounts; // alice = người đăng ký, bob = người khác
  // Giả lập mã băm SHA-256 của hai file khác nhau
  const DOC_A = web3.utils.soliditySha3("noi dung file A");
  const DOC_B = web3.utils.soliditySha3("noi dung file B");
  let reg;

  // Mỗi test chạy trên một contract mới tinh
  beforeEach(async () => {
    reg = await DocumentRegistry.new();
  });

  it("tài liệu chưa đăng ký thì verify trả về registered = false", async () => {
    const r = await reg.verify(DOC_A);
    assert.isFalse(r.registered);
    assert.equal(r.issuer, "0x0000000000000000000000000000000000000000");
  });

  it("đăng ký thành công: verify trả đúng người đăng ký, phát sự kiện kèm tên tài liệu", async () => {
    const tx = await reg.register(DOC_A, "Hop dong vay 01/2026", { from: alice });

    const log = tx.logs[0];
    assert.equal(log.event, "DocumentRegistered");
    assert.equal(log.args.docHash, DOC_A);
    assert.equal(log.args.issuer, alice);
    assert.equal(log.args.title, "Hop dong vay 01/2026");

    const r = await reg.verify(DOC_A);
    assert.isTrue(r.registered);
    assert.equal(r.issuer, alice);
    assert.isFalse(r.revoked);
    assert.isAbove(r.registeredAt.toNumber(), 0);
    assert.equal((await reg.documentCount()).toNumber(), 1);

    // File khác (hoặc file A bị sửa) thì vẫn là chưa đăng ký
    assert.isFalse((await reg.verify(DOC_B)).registered);
  });

  it("không cho đăng ký trùng một tài liệu (kể cả người khác)", async () => {
    await reg.register(DOC_A, "Ban goc", { from: alice });
    await expectRevert(reg.register(DOC_A, "Ban sao", { from: bob }), "Already registered");
  });

  it("không cho mã băm rỗng, tên rỗng hoặc tên dài quá 100 byte", async () => {
    const zero = "0x" + "0".repeat(64);
    await expectRevert(reg.register(zero, "Tai lieu", { from: alice }), "Invalid hash");
    await expectRevert(reg.register(DOC_A, "", { from: alice }), "Title is empty");
    await expectRevert(reg.register(DOC_A, "a".repeat(101), { from: alice }), "Title is too long");
  });

  it("người đăng ký thu hồi được, verify báo revoked và phát sự kiện DocumentRevoked", async () => {
    await reg.register(DOC_A, "Chung chi", { from: alice });
    const tx = await reg.revoke(DOC_A, { from: alice });

    assert.equal(tx.logs[0].event, "DocumentRevoked");
    assert.equal(tx.logs[0].args.issuer, alice);

    const r = await reg.verify(DOC_A);
    assert.isTrue(r.registered);
    assert.isTrue(r.revoked);
  });

  it("người khác không thu hồi được tài liệu", async () => {
    await reg.register(DOC_A, "Chung chi", { from: alice });
    await expectRevert(reg.revoke(DOC_A, { from: bob }), "Only the issuer can do this");
  });

  it("không thu hồi tài liệu chưa đăng ký hoặc đã thu hồi", async () => {
    await expectRevert(reg.revoke(DOC_A, { from: alice }), "Document not registered");
    await reg.register(DOC_A, "Chung chi", { from: alice });
    await reg.revoke(DOC_A, { from: alice });
    await expectRevert(reg.revoke(DOC_A, { from: alice }), "Already revoked");
  });

  it("tài liệu đã thu hồi không đăng ký lại được (lịch sử được giữ nguyên)", async () => {
    await reg.register(DOC_A, "Chung chi", { from: alice });
    await reg.revoke(DOC_A, { from: alice });
    await expectRevert(reg.register(DOC_A, "Dang ky lai", { from: alice }), "Already registered");
  });
});

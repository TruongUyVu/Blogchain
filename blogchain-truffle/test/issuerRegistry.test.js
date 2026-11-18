const IssuerRegistry = artifacts.require("IssuerRegistry");
const { expectRevert } = require("./helpers");

contract("IssuerRegistry", (accounts) => {
  // institute = chủ sở hữu (ví của Viện), ta = trợ giảng, student = sinh viên
  const [institute, ta, student] = accounts;
  const NAME = "Viện Công nghệ Tài chính – Trường Đại học Đại Nam";
  let reg;

  beforeEach(async () => {
    reg = await IssuerRegistry.new({ from: institute });
  });

  it("người deploy là chủ sở hữu; ví chưa xác minh thì getIssuer trả verified = false", async () => {
    assert.equal(await reg.owner(), institute);
    const r = await reg.getIssuer(student);
    assert.isFalse(r.verified);
    assert.equal(r.name, "");
  });

  it("chủ sở hữu xác minh một ví kèm tên (tiếng Việt có dấu), phát sự kiện IssuerSet", async () => {
    const tx = await reg.setIssuer(institute, NAME, { from: institute });
    assert.equal(tx.logs[0].event, "IssuerSet");
    assert.equal(tx.logs[0].args.account, institute);
    assert.equal(tx.logs[0].args.name, NAME);

    const r = await reg.getIssuer(institute);
    assert.isTrue(r.verified);
    assert.equal(r.name, NAME);
    assert.isAbove(r.since.toNumber(), 0);
    assert.equal((await reg.issuerCount()).toNumber(), 1);
  });

  it("đổi tên ví đã xác minh: giữ nguyên thời điểm xác minh và số lượng", async () => {
    await reg.setIssuer(ta, "Trợ giảng", { from: institute });
    const since = (await reg.getIssuer(ta)).since.toNumber();
    await reg.setIssuer(ta, "Trợ giảng lớp FinTech", { from: institute });
    const r = await reg.getIssuer(ta);
    assert.equal(r.name, "Trợ giảng lớp FinTech");
    assert.equal(r.since.toNumber(), since);
    assert.equal((await reg.issuerCount()).toNumber(), 1);
  });

  it("chỉ chủ sở hữu được thêm / gỡ; sinh viên tự xác minh mình bị từ chối", async () => {
    await expectRevert(reg.setIssuer(student, "Viện giả mạo", { from: student }), "Only the owner can do this");
    await reg.setIssuer(ta, "Trợ giảng", { from: institute });
    await expectRevert(reg.removeIssuer(ta, { from: student }), "Only the owner can do this");
  });

  it("không nhận địa chỉ 0, tên rỗng hoặc dài quá 100 byte", async () => {
    await expectRevert(
      reg.setIssuer("0x0000000000000000000000000000000000000000", "X", { from: institute }),
      "Invalid address"
    );
    await expectRevert(reg.setIssuer(ta, "", { from: institute }), "Name is empty");
    await expectRevert(reg.setIssuer(ta, "a".repeat(101), { from: institute }), "Name is too long");
  });

  it("gỡ xác minh: verified = false, phát IssuerRemoved; không gỡ ví chưa xác minh", async () => {
    await expectRevert(reg.removeIssuer(ta, { from: institute }), "Not a verified issuer");
    await reg.setIssuer(ta, "Trợ giảng", { from: institute });
    const tx = await reg.removeIssuer(ta, { from: institute });
    assert.equal(tx.logs[0].event, "IssuerRemoved");
    assert.isFalse((await reg.getIssuer(ta)).verified);
    assert.equal((await reg.issuerCount()).toNumber(), 0);
  });

  it("chuyển quyền chủ sở hữu: chủ mới sửa được danh bạ, chủ cũ mất quyền", async () => {
    await reg.transferOwnership(ta, { from: institute });
    assert.equal(await reg.owner(), ta);
    await expectRevert(reg.setIssuer(student, "X", { from: institute }), "Only the owner can do this");
    await reg.setIssuer(institute, NAME, { from: ta });
    assert.isTrue((await reg.getIssuer(institute)).verified);
  });
});

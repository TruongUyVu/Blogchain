const BlogChain = artifacts.require("BlogChain");
const BlogModeration = artifacts.require("BlogModeration");

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

contract("BlogModeration", (accounts) => {
  // teacher = chủ sở hữu (người deploy), ta = trợ giảng, student = sinh viên
  const [teacher, ta, student] = accounts;
  let blog, mod;

  // Mỗi test: một blog mới có 2 bài của sinh viên, và một contract kiểm duyệt trỏ tới blog đó
  beforeEach(async () => {
    blog = await BlogChain.new();
    await blog.createPost("Bai 0", "Noi dung binh thuong", { from: student });
    await blog.createPost("Bai 1", "Noi dung khong phu hop", { from: student });
    mod = await BlogModeration.new(blog.address, { from: teacher });
  });

  it("người deploy là chủ sở hữu và có quyền kiểm duyệt; người khác thì không", async () => {
    assert.equal(await mod.owner(), teacher);
    assert.equal(await mod.blog(), blog.address);
    assert.isTrue(await mod.canModerate(teacher));
    assert.isFalse(await mod.canModerate(student));
  });

  it("không deploy được khi địa chỉ blog không phải contract", async () => {
    await expectRevert(BlogModeration.new(student, { from: teacher }), "Blog contract not found");
  });

  it("chủ sở hữu ẩn bài kèm lý do: phát sự kiện PostHidden, getHiddenFlags báo đúng", async () => {
    const tx = await mod.hidePost(1, "Noi dung khong phu hop", { from: teacher });
    const log = tx.logs[0];
    assert.equal(log.event, "PostHidden");
    assert.equal(log.args.postId.toNumber(), 1);
    assert.equal(log.args.moderator, teacher);
    assert.equal(log.args.reason, "Noi dung khong phu hop");

    assert.isTrue(await mod.isHidden(1));
    assert.isFalse(await mod.isHidden(0));
    assert.deepEqual(await mod.getHiddenFlags(0, 2), [false, true]);
    assert.equal((await mod.hiddenCount()).toNumber(), 1);

    // Dữ liệu bài trên blog vẫn còn nguyên (chỉ là bị ẩn trên giao diện)
    assert.equal((await blog.getPost(1)).content, "Noi dung khong phu hop");
  });

  it("sinh viên (không phải quản trị viên) không ẩn / hiện được bài", async () => {
    await expectRevert(mod.hidePost(1, "Ly do", { from: student }), "Only moderators can do this");
    await mod.hidePost(1, "Ly do", { from: teacher });
    await expectRevert(mod.unhidePost(1, { from: student }), "Only moderators can do this");
  });

  it("không ẩn bài không tồn tại, bài đã ẩn, hoặc lý do rỗng / dài quá 200 byte", async () => {
    await expectRevert(mod.hidePost(5, "Ly do", { from: teacher }), "Post does not exist");
    await expectRevert(mod.hidePost(1, "", { from: teacher }), "Reason is empty");
    await expectRevert(mod.hidePost(1, "a".repeat(201), { from: teacher }), "Reason is too long");
    await mod.hidePost(1, "Ly do", { from: teacher });
    await expectRevert(mod.hidePost(1, "Lan nua", { from: teacher }), "Post is already hidden");
  });

  it("hiện lại bài đã ẩn: phát sự kiện PostUnhidden; không hiện lại bài đang hiển thị", async () => {
    await expectRevert(mod.unhidePost(0, { from: teacher }), "Post is not hidden");
    await mod.hidePost(1, "Ly do", { from: teacher });
    const tx = await mod.unhidePost(1, { from: teacher });
    assert.equal(tx.logs[0].event, "PostUnhidden");
    assert.isFalse(await mod.isHidden(1));
    assert.equal((await mod.hiddenCount()).toNumber(), 0);
  });

  it("chủ sở hữu thêm trợ giảng làm quản trị viên; trợ giảng ẩn được bài; bớt quyền thì hết ẩn được", async () => {
    const tx = await mod.setModerator(ta, true, { from: teacher });
    assert.equal(tx.logs[0].event, "ModeratorUpdated");
    assert.isTrue(await mod.canModerate(ta));

    await mod.hidePost(1, "Tro giang an", { from: ta });
    assert.isTrue(await mod.isHidden(1));

    await mod.setModerator(ta, false, { from: teacher });
    await expectRevert(mod.unhidePost(1, { from: ta }), "Only moderators can do this");
  });

  it("chỉ chủ sở hữu được thêm quản trị viên; không thêm trùng hoặc địa chỉ 0", async () => {
    await expectRevert(mod.setModerator(student, true, { from: student }), "Only the owner can do this");
    await mod.setModerator(ta, true, { from: teacher });
    await expectRevert(mod.setModerator(ta, true, { from: teacher }), "No change");
    await expectRevert(
      mod.setModerator("0x0000000000000000000000000000000000000000", true, { from: teacher }),
      "Invalid address"
    );
  });

  it("chuyển quyền chủ sở hữu: chủ mới quản lý được, chủ cũ mất quyền", async () => {
    await mod.transferOwnership(ta, { from: teacher });
    assert.equal(await mod.owner(), ta);
    assert.isFalse(await mod.canModerate(teacher));
    await expectRevert(mod.setModerator(student, true, { from: teacher }), "Only the owner can do this");
    await mod.setModerator(student, true, { from: ta });
    assert.isTrue(await mod.canModerate(student));
  });
});

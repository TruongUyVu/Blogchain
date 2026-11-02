const BlogChain = artifacts.require("BlogChain");

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

contract("BlogChain", (accounts) => {
  const [alice, bob] = accounts; // alice = tác giả, bob = người khác
  let blog;

  // Mỗi test chạy trên một contract mới tinh
  beforeEach(async () => {
    blog = await BlogChain.new();
  });

  it("ban đầu chưa có bài viết nào", async () => {
    const count = await blog.getPostCount();
    assert.equal(count.toNumber(), 0);
  });

  it("đăng bài thành công và phát sự kiện PostCreated", async () => {
    const tx = await blog.createPost("Bai dau tien", "Xin chao blockchain", { from: alice });

    const log = tx.logs[0];
    assert.equal(log.event, "PostCreated");
    assert.equal(log.args.id.toNumber(), 0);
    assert.equal(log.args.author, alice);
    assert.equal(log.args.title, "Bai dau tien");

    assert.equal((await blog.getPostCount()).toNumber(), 1);

    const post = await blog.getPost(0);
    assert.equal(post.author, alice);
    assert.equal(post.title, "Bai dau tien");
    assert.equal(post.content, "Xin chao blockchain");
    assert.equal(post.deleted, false);
  });

  it("id bài viết tăng dần theo thứ tự đăng", async () => {
    await blog.createPost("A", "a", { from: alice });
    await blog.createPost("B", "b", { from: bob });
    assert.equal((await blog.getPost(0)).title, "A");
    assert.equal((await blog.getPost(1)).title, "B");
    assert.equal((await blog.getPost(1)).author, bob);
  });

  it("không cho đăng bài có tiêu đề hoặc nội dung rỗng", async () => {
    await expectRevert(blog.createPost("", "noi dung", { from: alice }), "Title is empty");
    await expectRevert(blog.createPost("tieu de", "", { from: alice }), "Content is empty");
  });

  it("không cho đăng tiêu đề quá dài", async () => {
    const longTitle = "x".repeat(101);
    await expectRevert(blog.createPost(longTitle, "noi dung", { from: alice }), "Title is too long");
  });

  it("tác giả sửa được bài của mình", async () => {
    await blog.createPost("Cu", "noi dung cu", { from: alice });
    const tx = await blog.editPost(0, "Moi", "noi dung moi", { from: alice });
    assert.equal(tx.logs[0].event, "PostEdited");

    const post = await blog.getPost(0);
    assert.equal(post.title, "Moi");
    assert.equal(post.content, "noi dung moi");
  });

  it("người khác không sửa hoặc xóa được bài của tác giả", async () => {
    await blog.createPost("Cua Alice", "noi dung", { from: alice });
    await expectRevert(blog.editPost(0, "Hack", "hack", { from: bob }), "Only the author");
    await expectRevert(blog.deletePost(0, { from: bob }), "Only the author");
  });

  it("tác giả xóa mềm bài viết, không sửa được bài đã xóa", async () => {
    await blog.createPost("Se bi xoa", "noi dung", { from: alice });
    const tx = await blog.deletePost(0, { from: alice });
    assert.equal(tx.logs[0].event, "PostDeleted");

    const post = await blog.getPost(0);
    assert.equal(post.deleted, true);

    await expectRevert(blog.editPost(0, "A", "b", { from: alice }), "Post is deleted");
    await expectRevert(blog.deletePost(0, { from: alice }), "already deleted");
  });

  it("truy cập bài không tồn tại sẽ bị revert", async () => {
    await expectRevert(blog.getPost(99), "Post does not exist");
  });
});

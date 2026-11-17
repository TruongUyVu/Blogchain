const BlogChain = artifacts.require("BlogChain");
const BlogModeration = artifacts.require("BlogModeration");

// Contract kiểm duyệt trỏ tới contract BlogChain đã deploy trên cùng mạng (không deploy lại blog)
module.exports = async function (deployer) {
  const blog = await BlogChain.deployed();
  await deployer.deploy(BlogModeration, blog.address);
};

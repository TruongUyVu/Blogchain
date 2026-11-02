const BlogChain = artifacts.require("BlogChain");

module.exports = function (deployer) {
  deployer.deploy(BlogChain);
};

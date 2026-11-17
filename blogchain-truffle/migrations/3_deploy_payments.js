const Payments = artifacts.require("Payments");

module.exports = function (deployer) {
  deployer.deploy(Payments);
};

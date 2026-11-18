const IssuerRegistry = artifacts.require("IssuerRegistry");
const MultiSend = artifacts.require("MultiSend");

// Danh bạ người phát hành đã xác minh (cho thẻ Xác thực) + phát ETH cho nhiều ví (cho thẻ Chuyển tiền).
// Người deploy là chủ sở hữu IssuerRegistry. Hai contract độc lập, không đụng contract cũ.
module.exports = async function (deployer) {
  await deployer.deploy(IssuerRegistry);
  await deployer.deploy(MultiSend);
};

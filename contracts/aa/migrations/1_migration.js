var WalletFactory = artifacts.require("WalletAccountFactory");

module.exports = function(deployer) {
  // deployment steps
  const entryPointAddress = '0x0576a174D229E3cFA37253523E645A78A0C91B57';
  deployer.deploy(WalletFactory, entryPointAddress);
};
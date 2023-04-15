const ethereumjsUtil = require('ethereumjs-util')
const abi = require('@ethersproject/abi')
const bytesPrj = require('@ethersproject/bytes')


// Address
const AddressZero = "0x0000000000000000000000000000000000000000"
const CHAIN_ID = 80001// polygohn mumbaiのchainId

const DefaultsForUserOp = {
  sender: AddressZero,
  nonce: 0,
  initCode: '0x',
  callData: '0x',
  callGasLimit: 0,
  verificationGasLimit: 100000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
  preVerificationGas: 21000, // should also cover calldata cost.
  maxFeePerGas: 0,
  maxPriorityFeePerGas: 1e9,
  paymasterAndData: '0x',
  signature: '0x'
}

const WalletAccount = artifacts.require("WalletAccount");
const WalletAccountTest = artifacts.require("WalletAccountTest");
const WalletAccountFactory = artifacts.require("WalletAccountFactory");

function fillUserOpDefaults (op, defaults = DefaultsForUserOp) {
  const partial = { ...op }
  // we want "item:undefined" to be used from defaults, and not override defaults, so we must explicitly
  // remove those so "merge" will succeed.
  for (const key in partial) {
    if (partial[key] == null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete partial[key]
    }
  }
  const filled = { ...defaults, ...partial }
  return filled
}

// function signUserOp (op, signer, entryPoint, chainId) {
//   const message = getUserOpHash(op, entryPoint, chainId)
//   const msg1 = Buffer.concat([
//     Buffer.from('\x19Ethereum Signed Message:\n32', 'ascii'),
//     Buffer.from(bytesPrj.arrayify(message))
//   ])

//   const sig = ethereumjsUtil.ecsign(ethereumjsUtil.keccak256(msg1), Buffer.from(bytesPrj.arrayify(signer.privateKey)))
//   // that's equivalent of:  await signer.signMessage(message);
//   // (but without "async"
//   const signedMessage1 = ethereumjsUtil.toRpcSig(sig.v, sig.r, sig.s)
//   return {
//     ...op,
//     signature: signedMessage1
//   }
// }

function getUserOpSign (op, signer, entryPoint, chainId) {
  const message = getUserOpHash(op, entryPoint, chainId)
  const msg1 = Buffer.concat([
    Buffer.from('\x19Ethereum Signed Message:\n32', 'ascii'),
    Buffer.from(bytesPrj.arrayify(message))
  ])

  const sig = ethereumjsUtil.ecsign(ethereumjsUtil.keccak256(msg1), Buffer.from(bytesPrj.arrayify(signer.privateKey)))
  // that's equivalent of:  await signer.signMessage(message);
  // (but without "async"
  const signedMessage1 = ethereumjsUtil.toRpcSig(sig.v, sig.r, sig.s)
  return signedMessage1
}

function packUserOp (op, forSignature = true) {
  if (forSignature) {
    // lighter signature scheme (must match UserOperation#pack): do encode a zero-length signature, but strip afterwards the appended zero-length value
    const userOpType = {
      components: [
        { type: 'address', name: 'sender' },
        { type: 'uint256', name: 'nonce' },
        { type: 'bytes', name: 'initCode' },
        { type: 'bytes', name: 'callData' },
        { type: 'uint256', name: 'callGasLimit' },
        { type: 'uint256', name: 'verificationGasLimit' },
        { type: 'uint256', name: 'preVerificationGas' },
        { type: 'uint256', name: 'maxFeePerGas' },
        { type: 'uint256', name: 'maxPriorityFeePerGas' },
        { type: 'bytes', name: 'paymasterAndData' },
        { type: 'bytes', name: 'signature' }
      ],
      name: 'userOp',
      type: 'tuple'
    }
    let encoded = abi.defaultAbiCoder.encode([userOpType], [{ ...op, signature: '0x' }])
    // remove leading word (total length) and trailing word (zero-length signature)
    encoded = '0x' + encoded.slice(66, encoded.length - 64)
    return encoded
  }
  const typevalues = [
    { type: 'address', val: op.sender },
    { type: 'uint256', val: op.nonce },
    { type: 'bytes', val: op.initCode },
    { type: 'bytes', val: op.callData },
    { type: 'uint256', val: op.callGasLimit },
    { type: 'uint256', val: op.verificationGasLimit },
    { type: 'uint256', val: op.preVerificationGas },
    { type: 'uint256', val: op.maxFeePerGas },
    { type: 'uint256', val: op.maxPriorityFeePerGas },
    { type: 'bytes', val: op.paymasterAndData }
  ]
  if (!forSignature) {
    // for the purpose of calculating gas cost, also hash signature
    typevalues.push({ type: 'bytes', val: op.signature })
  }
  return encode(typevalues, forSignature)
}

function getUserOpHash (op, entryPoint, chainId) {
  const userOpHash = web3.utils.keccak256(packUserOp(op, true))
  const enc = abi.defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPoint, chainId])
  return web3.utils.keccak256(enc)
}

contract("account test", (accounts) => {
  it("single sig", async () => {
    const walletAccountTestInstance = await WalletAccountTest.new();
    const entryPoint = walletAccountTestInstance.address;
    const accountOwner = web3.eth.accounts.create();
    const factory = await WalletAccountFactory.new(entryPoint);
    await factory.createAccount(accountOwner.address, 0)
    const accountProxyAddress = await factory.getAddress(accountOwner.address, 0)

    await walletAccountTestInstance.setTestContract(accountProxyAddress);

    const defaultUserOp = fillUserOpDefaults({
      sender: accountProxyAddress,
    })
    const sign = getUserOpSign(defaultUserOp, accountOwner, entryPoint, CHAIN_ID)
    const userOp = {
      ...defaultUserOp,
      signature: sign
    }
    const userOpHash = await getUserOpHash(userOp, entryPoint, CHAIN_ID)
    const resultBefore = await walletAccountTestInstance.latestValidationData()
    assert.equal(resultBefore.toString(), "0", "error");
    await walletAccountTestInstance.validateUserOp(userOp, userOpHash, 0)
    const resultAfter = await walletAccountTestInstance.latestValidationData()
    assert.equal(resultAfter.toString(), "0", "error");
  });
  it("set pkpAddress", async () => {
    const pkpAddress = accounts[2]
    const entryPoint = accounts[3]
    const walletAccountInstance = await WalletAccount.new(entryPoint);
    let tmp = await walletAccountInstance.pkpAddress();
    assert.equal("0x0000000000000000000000000000000000000000", tmp, "error");
    await walletAccountInstance.setPKPAddress(pkpAddress, {from: entryPoint});
    tmp = await walletAccountInstance.pkpAddress();
    assert.equal(pkpAddress.toString(), tmp, "error");
  });
  it("set escape", async () => {
    const escapeAddress = accounts[2]
    const entryPoint = accounts[3]
    const walletAccountInstance = await WalletAccount.new(entryPoint);
    let tmp = await walletAccountInstance.escapeAddress();
    assert.equal("0x0000000000000000000000000000000000000000", tmp, "error");
    await walletAccountInstance.setEscapeAddress(escapeAddress, {from: entryPoint});
    tmp = await walletAccountInstance.escapeAddress();
    assert.equal(escapeAddress.toString(), tmp, "error");
  });

  it("executeSocialRecovery", async () => {
    const pkpAddress = accounts[2]
    const entryPoint = accounts[3]
    const escape = web3.eth.accounts.create();
    const wallet = accounts[5]
    const walletAccountInstance = await WalletAccount.new(entryPoint);
    await web3.eth.sendTransaction({from: wallet, to: walletAccountInstance.address, value: "1000000000000000000"})
    await walletAccountInstance.setPKPAddress(pkpAddress, {from: entryPoint});
    await walletAccountInstance.setEscapeAddress(escape.address, {from: entryPoint});
    let balance = await web3.eth.getBalance(escape.address);
    assert.equal(balance.toString(), "0", "error");
    await walletAccountInstance.executeSocialRecovery({from: pkpAddress})
    balance = await web3.eth.getBalance(escape.address);
    assert.equal(balance.toString(), "1000000000000000000", "error");
  });

  it.skip("multi sig", async () => {
    const walletAccountTestInstance = await WalletAccountTest.new();
    const entryPoint = walletAccountTestInstance.address;
    const accountOwner = web3.eth.accounts.create();
    const accountSecondOwner = web3.eth.accounts.create();
    const factory = await WalletAccountFactory.new(entryPoint);
    await factory.createAccount(accountOwner.address, 0)
    const accountProxyAddress = await factory.getAddress(accountOwner.address, 0)
    // WalletAcountのインスタンスを作成、その際、アドレスはaccountProxyAddressを指定
    const walletAccount = await WalletAccount.at(accountProxyAddress);
    const defaultUserOp = fillUserOpDefaults({
      sender: accountProxyAddress,
    })
    const hash = await walletAccount.getUserOperationHash(defaultUserOp);
    const sig = await web3.eth.sign(bytesPrj.arrayify(hash), account)
    const signingAddress = web3.eth.accounts.recover(bytesPrj.arrayify(hash), 
    sig);
    console.log(accountOwner.address)
    console.log(signingAddress)
    // const userOp = {
    //   ...defaultUserOp,
    //   signature: sign
    // }
    

    // await walletAccountTestInstance.setTestContract(accountProxyAddress);
    // const tx = await walletAccountTestInstance.setSecondOwner(accountSecondOwner.address);
    // console.log(tx)
  });
});

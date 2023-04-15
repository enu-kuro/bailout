import { BaseProvider } from '@metamask/providers';
import { Contract, ethers } from 'ethers';
import { HttpRpcClient, SimpleAccountAPI } from '@account-abstraction/sdk';
import { UserOperationStruct } from '@account-abstraction/contracts';
import config from '../../../../aaConfig.json';
import WalletAccount from '../../../../contracts/WalletAccount.json';
import { ChainId, changeNetwork } from '../utils';
import { myWrapProvider } from './myWrapProvider';

const entryPointAddress = config.entryPoint;
const factoryAddress = config.walletAccountFactory;
const { bundlerUrl, rpcUrl } = config;

const getAAConfig = async (provider: ethers.providers.BaseProvider) => {
  return {
    chainId: await provider.getNetwork().then((net) => net.chainId),
    entryPointAddress,
    bundlerUrl,
  };
};

export const getAddress = async (): Promise<string> => {
  const provider = new ethers.providers.Web3Provider(
    window.ethereum as unknown as BaseProvider,
  );

  const accounts = await provider.send('eth_requestAccounts', []);
  console.log('accounts', accounts);
  const aaSigner = provider.getSigner();
  console.log('Signer', aaSigner);
  const aaProvider = await myWrapProvider(
    provider,
    await getAAConfig(provider),
    aaSigner,
    factoryAddress,
  );
  const walletAddress = await aaProvider.getSigner().getAddress();
  return walletAddress;
};

export const getBalance = async (address: string): Promise<string> => {
  const provider = new ethers.providers.Web3Provider(
    window.ethereum as unknown as BaseProvider,
  );
  const balance = await provider.getBalance(address);
  return ethers.utils.formatEther(balance);
};

export const getAAState = async () => {
  await changeNetwork(ChainId.mumbai);
  const aaProvider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

  const ethProvider = new ethers.providers.Web3Provider(
    window.ethereum as unknown as BaseProvider,
  );
  await ethProvider.send('eth_requestAccounts', []);
  const signer = ethProvider.getSigner();
  const accountAPI = new SimpleAccountAPI({
    provider: aaProvider,
    owner: signer,
    entryPointAddress,
    factoryAddress,
  });
  const address = await accountAPI.getAccountAddress();
  const balance = (await aaProvider.getBalance(address)).toString();

  const code = await ethProvider.getCode(address);
  if (code === '0x') {
    return { address, balance, deployed: false };
  }
  const myContract = new Contract(address, WalletAccount.abi, aaProvider);
  const secondOwner = (await myContract.secondOwner()) as string;
  const escapeAddress = (await myContract.escapeAddress()) as string;
  const pkpAddress = (await myContract.pkpAddress()) as string;

  return {
    address,
    balance,
    secondOwner,
    deployed: true,
    socialRecoveryProverAddress: pkpAddress,
    escapeAddress,
  };
};

export const set2Fa = async (address: string) => {
  await changeNetwork(ChainId.mumbai);
  console.log('set2Fa');
  const aaProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const ethProvider = new ethers.providers.Web3Provider(
    window.ethereum as unknown as BaseProvider,
  );

  await ethProvider.send('eth_requestAccounts', []);
  const signer = ethProvider.getSigner();
  console.log('signer', signer);
  const accountAPI = new SimpleAccountAPI({
    provider: aaProvider,
    owner: signer,
    entryPointAddress,
    factoryAddress,
  });
  const myAddress = await accountAPI.getAccountAddress();
  console.log('account address', myAddress);
  const myContract = new Contract(myAddress, WalletAccount.abi, aaProvider);
  console.log('address', address);

  const singedUserOp = await accountAPI.createSignedUserOp({
    target: myAddress,
    value: 0,
    data: '0x',
    maxPriorityFeePerGas: 0x2540be400, // 15gwei
    maxFeePerGas: 0x6fc23ac00, // 30gewi
  });

  // const singedUserOp = await accountAPI.createSignedUserOp({
  //   target: myAddress,
  //   data: myContract.interface.encodeFunctionData('setSecondOwner', [address]),
  //   maxPriorityFeePerGas: 0x2540be400, // 15gwei
  //   maxFeePerGas: 0x6fc23ac00, // 30gewi
  // });

  // const op = await accountAPI.createUnsignedUserOp({
  //   target: myAddress,
  //   data: myContract.interface.encodeFunctionData('setSecondOwner', [address]),
  //   maxPriorityFeePerGas: 0x2540be400, // 15gwei
  //   maxFeePerGas: 0x6fc23ac00, // 30gewi
  //   // gasLimit: 0x5543df729c000, // 1500000gwei
  // });

  // console.log('signedUserOp', op);

  // First transaction after deployment always fails. because of the gas??
  // // 0x048611 296465 0x7a120 500000
  // op.verificationGasLimit = BigNumber.from('0x7a120');
  // // 45448
  // op.preVerificationGas = 45448 * 5;

  // const singedUserOp = await accountAPI.signUserOp(op);

  console.log('singedUserOp', singedUserOp);

  const client = new HttpRpcClient(
    bundlerUrl,
    entryPointAddress,
    Number(ChainId.mumbai),
  );

  const uoHash = await client.sendUserOpToBundler(singedUserOp);
  console.log(`UserOpHash: ${uoHash}`);

  console.log('Waiting for transaction...');
  const txHash = await accountAPI.getUserOpReceipt(uoHash, 10000);
  console.log(`Transaction hash: ${txHash}`);

  const singedUserOp2 = await accountAPI.createSignedUserOp({
    target: myAddress,
    data: myContract.interface.encodeFunctionData('setSecondOwner', [address]),
    maxPriorityFeePerGas: 0x2540be400, // 15gwei
    maxFeePerGas: 0x6fc23ac00, // 30gewi
  });
  const uoHash2 = await client.sendUserOpToBundler(singedUserOp2);
  console.log(`UserOpHash: ${uoHash}`);

  console.log('Waiting for transaction...');
  const txHash2 = await accountAPI.getUserOpReceipt(uoHash2);
  console.log(`Transaction hash: ${txHash2}`);
  return txHash;
};

export const createUnsignedUserOp = async ({
  targetAddress,
  sendValue = 0,
  data = '0x',
}: {
  targetAddress: string;
  sendValue?: number;
  data?: string;
}) => {
  const value = ethers.utils.parseEther(sendValue.toString());
  const provider = new ethers.providers.Web3Provider(
    window.ethereum as BaseProvider,
  );
  await provider.send('eth_requestAccounts', []);
  const signer = provider.getSigner();

  const accountAPI = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner: signer,
    factoryAddress,
  });

  // getGasFee() won't culculate enough gas fee for the first transaction.
  const userOp = await accountAPI.createUnsignedUserOp({
    target: targetAddress,
    value,
    data,
    maxPriorityFeePerGas: 0x2540be400, // 15gwei
    maxFeePerGas: 0x6fc23ac00, // 30gewi
  });
  // const userOp = await resolveObjectPromises(_userOp);
  console.log('createUnsignedUserOp', userOp);

  // for 2FA. signature field is longer, so gas fee is more.
  // userOp.preVerificationGas *= 1.5;

  const userOpHash = await accountAPI.getUserOpHash(userOp);

  return { userOpHash, userOp };
};

export const transfer = async ({
  userOp,
  signature,
}: {
  userOp: UserOperationStruct;
  signature: string;
}) => {
  console.log('transferFromAA');
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

  const ethProvider = new ethers.providers.Web3Provider(
    window.ethereum as unknown as BaseProvider,
  );
  await ethProvider.send('eth_requestAccounts', []);
  const signer = ethProvider.getSigner();

  const accountAPI = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner: signer,
    factoryAddress,
  });

  console.log('userOp', JSON.stringify(userOp));
  const signedUserOp = await accountAPI.signUserOp(userOp);

  const client = new HttpRpcClient(
    bundlerUrl,
    entryPointAddress,
    Number(ChainId.mumbai),
  );

  // TODO: 2FA(multisig)
  const sig = await signedUserOp.signature;
  console.log('signature', signature);
  console.log('sig', sig);

  console.log('signedUserOp', signedUserOp);
  const uoHash = await client.sendUserOpToBundler(signedUserOp);
  console.log(`UserOpHash: ${uoHash}`);

  console.log('Waiting for transaction...');
  const txHash = await accountAPI.getUserOpReceipt(uoHash);
  console.log(`Transaction hash: ${txHash}`);
  return txHash;
};

export const setupSocialRecovery = async ({
  targetAddress,
  proverAddress,
}: {
  targetAddress: string;
  proverAddress: string;
}) => {
  await changeNetwork(ChainId.mumbai);
  console.log('setupSocialRecovery');
  const aaProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const ethProvider = new ethers.providers.Web3Provider(
    window.ethereum as unknown as BaseProvider,
  );

  await ethProvider.send('eth_requestAccounts', []);
  const signer = ethProvider.getSigner();

  const accountAPI = new SimpleAccountAPI({
    provider: aaProvider,
    owner: signer,
    entryPointAddress,
    factoryAddress,
  });
  const myAddress = await accountAPI.getAccountAddress();
  const myContract = new Contract(myAddress, WalletAccount.abi, aaProvider);

  // TODO: 2FA
  const op = await accountAPI.createSignedUserOp({
    target: myAddress,
    data: myContract.interface.encodeFunctionData('setupSocialRecovery', [
      targetAddress,
      proverAddress,
    ]),
    maxPriorityFeePerGas: 0x2540be400, // 15gwei
    maxFeePerGas: 0x6fc23ac00, // 30gewi
  });

  const client = new HttpRpcClient(
    bundlerUrl,
    entryPointAddress,
    Number(ChainId.mumbai),
  );

  const uoHash = await client.sendUserOpToBundler(op);
  console.log(`UserOpHash: ${uoHash}`);

  console.log('Waiting for transaction...');
  const txHash = await accountAPI.getUserOpReceipt(uoHash);
  console.log(`Transaction hash: ${txHash}`);

  return txHash;
};

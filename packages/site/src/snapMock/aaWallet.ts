import { BaseProvider } from '@metamask/providers';
import { Contract, ethers } from 'ethers';
import { SimpleAccountAPI } from '@account-abstraction/sdk';
import config from '../../../../aaConfig.json';
import WalletAccount from '../../../../contracts/WalletAccount.json';
import { myWrapProvider } from './myWrapProvider';

const entryPointAddress = config.entryPoint;
const factoryAddress = config.walletAccountFactory;
const { bundlerUrl } = config;

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
    return { address, balance, secondOwner: null, deployed: false };
  }
  const myContract = new Contract(address, WalletAccount.abi, aaProvider);
  const secondOwner = (await myContract.secondOwner()) as string;

  return { address, balance, secondOwner, deployed: true };
};

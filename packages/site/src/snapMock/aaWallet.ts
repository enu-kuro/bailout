import { BaseProvider } from '@metamask/providers';
import { ethers } from 'ethers';
import config from '../../../../aaConfig.json';
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

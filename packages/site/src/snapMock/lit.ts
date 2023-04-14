import { BaseProvider } from '@metamask/providers';
import {
  ContractInterface,
  ContractTransaction,
  ethers,
  Signer,
  utils,
} from 'ethers';
import { toUtf8Bytes } from 'ethers/lib/utils';
import PKPNFTABI from '../../../../contracts/PKPNFT.json';
import PKPHelperABI from '../../../../contracts/PKPHelper.json';
import { ChainId, changeNetwork } from '../utils';

export type TokenPayload = {
  iss: string;
  at_hash?: string;
  email_verified?: boolean;
  sub: string;
  azp?: string;
  email?: string;
  profile?: string;
  picture?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  aud: string;
  iat: number;
  exp: number;
  nonce?: string;
  hd?: string;
  locale?: string;
};

const decodeJwt = (token: string) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/gu, '+').replace(/_/gu, '/');
  const decodedBase64 = window.atob(base64);
  const decodedToken = JSON.parse(
    decodeURIComponent(encodeURIComponent(decodedBase64)),
  ) as TokenPayload;
  return decodedToken;
};

export enum AuthMethodType {
  EthWallet = 1,
  LitAction,
  WebAuthn,
  Discord,
  Google,
  GoogleJwt,
}

const pkpNftAddress = '0xF5cB699652cED3781Dd75575EDBe075d6212DF98';
const pkpHelperAddress = '0x5a8e445BCFE85264566c32Be50A172F3d14F53Fc';

function getContract(
  contractAddress: string,
  contractJson: ContractInterface,
  signer?: Signer,
) {
  const ethersContract = new ethers.Contract(
    contractAddress,
    contractJson,
    signer,
  );
  return ethersContract;
}

const getPkpHelperContract = () => {
  return getContract(pkpHelperAddress, PKPHelperABI);
};

const getPkpNftContract = () => {
  return getContract(pkpNftAddress, PKPNFTABI);
};

export async function mintPKPWithIpfsCid({ ipfsCid }: { ipfsCid: string }) {
  return await mintPKP({
    authMethodType: AuthMethodType.LitAction,
    idForAuthMethod: ipfsCid,
  });
}

export async function mintPKPWithCredential({
  credential,
}: {
  credential: string;
}) {
  console.log('mintPKPWithCredential');
  const tokenPayload = decodeJwt(credential);
  if (!tokenPayload) {
    throw new Error('Failed to decode ID token');
  }
  const idForAuthMethod = utils.keccak256(
    toUtf8Bytes(`${tokenPayload.sub}:${tokenPayload.aud}`),
  );

  return await mintPKP({
    authMethodType: AuthMethodType.GoogleJwt,
    idForAuthMethod,
  });
}

async function mintPKP({
  authMethodType,
  idForAuthMethod,
}: {
  authMethodType: AuthMethodType;
  idForAuthMethod: string;
}) {
  try {
    await changeNetwork(ChainId.lit);

    const provider = new ethers.providers.Web3Provider(
      window.ethereum as BaseProvider,
    );
    const accounts = await provider.send('eth_requestAccounts', []);
    console.log('accounts', accounts);
    const signer = await provider.getSigner();
    console.log('in mintPKP');
    const pkpHelper = getPkpHelperContract().connect(signer);
    const pkpNft = getPkpNftContract().connect(signer);

    // first get mint cost
    const mintCost = await pkpNft.mintCost();

    // it doesn't return tx.
    const tx = (await pkpHelper.mintNextAndAddAuthMethods(
      2,
      [authMethodType],
      [idForAuthMethod],
      ['0x'],
      [[ethers.BigNumber.from('0')]],
      true,
      true,
      { value: mintCost },
    )) as ContractTransaction;
    console.log('txhash', tx.hash);
    const mintReceipt = await tx.wait();
    console.log('mintReceipt', mintReceipt);
    const tokenId = mintReceipt.logs[0].topics[3];
    console.log('minted token', tokenId);
    const pkpEthAddress = await pkpNft.getEthAddress(tokenId);
    const pkpPublicKey = await pkpNft.getPubkey(tokenId);
    console.log('pkpPublicKey', pkpPublicKey);
    return { pkpPublicKey, pkpEthAddress };
  } catch (e) {
    console.log('error', e);
    throw e;
  }
}

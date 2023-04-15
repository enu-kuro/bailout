import * as LitJsSdk from '@lit-protocol/lit-node-client';
// const LitJsSdk = {} as any;
import { BaseProvider } from '@metamask/providers';
import { serialize, UnsignedTransaction } from '@ethersproject/transactions';
import { ethers } from 'ethers';
import { ChainId, changeNetwork } from './metamask';

// TODO: enable multiple accounts
export const set2FaPkpPublicKey = async (pkpPublicKey: string) => {
  localStorage.setItem('2faPkpPublicKey', pkpPublicKey);
};

export const get2FaPkpPublicKey = () => {
  const pkpPublicKey = localStorage.getItem('2faPkpPublicKey');
  if (pkpPublicKey) {
    return pkpPublicKey;
  }
  // TODO: error
  return '';
};

export const setSocialRecoveryPkpPublicKey = async (pkpPublicKey: string) => {
  localStorage.setItem('socialRecoveryPkpPublicKey', pkpPublicKey);
};

export const getSocialRecoveryPkpPublicKey = () => {
  const pkpPublicKey = localStorage.getItem('socialRecoveryPkpPublicKey');
  if (pkpPublicKey) {
    return pkpPublicKey;
  }
  // TODO: error
  return '';
};

export const setSocialRecoveryPkpEthAddress = async (pkpEthAddress: string) => {
  localStorage.setItem('socialRecoveryPkpEthAddress', pkpEthAddress);
};

export const getSocialRecoveryPkpEthAddress = () => {
  const pkpEthAddress = localStorage.getItem('socialRecoveryPkpEthAddress');
  if (pkpEthAddress) {
    return pkpEthAddress;
  }
  // TODO: error
  return '';
};

export const setPkpIpfsCid = async (ipfsCid: string) => {
  localStorage.setItem('pkpIpfsCid', ipfsCid);
};

export const getPkpIpfsCid = () => {
  const pkpIpfsCid = localStorage.getItem('pkpIpfsCid');
  if (pkpIpfsCid) {
    return pkpIpfsCid;
  }
  // TODO: error
  return '';
};

const litActionCodeForSign = `
const go = async () => {
  const fromAddress = ethers.utils.computeAddress(publicKey);
  LitActions.setResponse({ response: JSON.stringify({fromAddress: fromAddress}) });
  const sigShare = await LitActions.ethPersonalSignMessageEcdsa({ message, publicKey, sigName });
  // const sigShare = await LitActions.signEcdsa({ toSign, publicKey, sigName });
};

go();
`;

export const signWithPkp = async ({
  message,
  pkpPublicKey,
  accessToken,
}: {
  message: string;
  pkpPublicKey: string;
  accessToken: string;
}) => {
  console.log('signWithPkp');
  console.log('pkpPublicKey', pkpPublicKey);
  console.log('accessToken', accessToken);

  const litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: 'serrano',
    debug: true,
  });

  await litNodeClient.connect();

  const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain: 'mumbai' });
  // const authSig = await ethConnect.signAndSaveAuthMessage({
  //   chainId: 80001,
  // });
  console.log('authSig', authSig);

  const results = await litNodeClient.executeJs({
    code: litActionCodeForSign,
    authSig,
    jsParams: {
      publicKey: pkpPublicKey,
      message,
      sigName: 'sig1',
    },
    authMethods: [
      {
        accessToken,
        authMethodType: 6,
      },
    ],
  });

  return results.signatures.sig1.signature as string;
};

export const executeSocialRecovery = async ({
  pkpPublicKey,
  ipfsId,
}: {
  pkpPublicKey: string;
  ipfsId: string;
}) => {
  await changeNetwork(ChainId.mumbai);
  const litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: 'serrano',
    debug: true,
  });
  console.log('litNodeClient', litNodeClient);

  await litNodeClient.connect();

  const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain: 'mumbai' });

  // often get timeout error...
  // {"errorKind":"Timeout","errorCode":"NodeJsTimeoutError","status":502,"message":"There was a timeout error executing the Javascript for this action","correlationId":"lit_05c152724478","details":["Your function exceeded the maximum runtime of 30000ms and was terminated."]}
  const results = await litNodeClient.executeJs({
    ipfsId,
    authSig,
    jsParams: {
      publicKey: pkpPublicKey,
      sigName: 'sig1',
    },
  });
  console.log('results', results);
  const socialRecoverytxParams = results.response as UnsignedTransaction;
  const proverSignature = results.signatures.sig1.signature;

  const provider = new ethers.providers.Web3Provider(
    window.ethereum as BaseProvider,
  );
  const serializedTx = serialize(socialRecoverytxParams, proverSignature);
  console.log('Execute Social Recovery!!!!!');
  try {
    const tx = await provider.sendTransaction(serializedTx);
    const receipt = await tx.wait();
    console.log('receipt', receipt);
    return receipt;
  } catch (e) {
    console.log('error', e);
  }
  return '';
};

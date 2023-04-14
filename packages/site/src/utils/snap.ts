import { defaultSnapOrigin } from '../config';
import { GetSnapsResponse, Snap } from '../types';
import {
  getAddress as getAddressSnap,
  getBalance as getBalanceSnap,
  getAAState as getAAStateSnap,
  set2Fa as set2FaSnap,
  setupSocialRecovery as setupSocialRecoverySnap,
} from '../snapMock/aaWallet';
import { mintPKPWithCredential, mintPKPWithIpfsCid } from '../snapMock/lit';
/**
 * Get the installed snaps in MetaMask.
 *
 * @returns The snaps installed in MetaMask.
 */
export const getSnaps = async (): Promise<GetSnapsResponse> => {
  return (await window.ethereum.request({
    method: 'wallet_getSnaps',
  })) as unknown as GetSnapsResponse;
};

/**
 * Connect a snap to MetaMask.
 *
 * @param snapId - The ID of the snap.
 * @param params - The params to pass with the snap to connect.
 */
export const connectSnap = async (
  snapId: string = defaultSnapOrigin,
  params: Record<'version' | string, unknown> = {},
) => {
  await window.ethereum.request({
    method: 'wallet_requestSnaps',
    params: {
      [snapId]: params,
    },
  });
};

/**
 * Get the snap from MetaMask.
 *
 * @param version - The version of the snap to install (optional).
 * @returns The snap object returned by the extension.
 */
export const getSnap = async (version?: string): Promise<Snap | undefined> => {
  try {
    const snaps = await getSnaps();

    return Object.values(snaps).find(
      (snap) =>
        snap.id === defaultSnapOrigin && (!version || snap.version === version),
    );
  } catch (e) {
    console.log('Failed to obtain installed snap', e);
    return undefined;
  }
};

/**
 * Invoke the "hello" method from the example snap.
 */

export const sendHello = async () => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: { snapId: defaultSnapOrigin, request: { method: 'hello' } },
  });
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');

export const getAddress = async () => {
  // return (await window.ethereum.request({
  //   method: 'wallet_invokeSnap',
  //   params: {
  //     snapId: defaultSnapOrigin,
  //     request: { method: 'connect' },
  //   },
  // })) as string;
  return await getAddressSnap();
};

export const getBalance = async (): Promise<string> => {
  // const balance = (await window.ethereum.request({
  //   method: 'wallet_invokeSnap',
  //   params: {
  //     snapId: defaultSnapOrigin,
  //     request: { method: 'balance' },
  //   },
  // })) as string;
  // return balance;
  const address = await getAddressSnap();
  return getBalanceSnap(address);
};

export const getAAState = async () => {
  // return (await window.ethereum.request({
  //   method: 'wallet_invokeSnap',
  //   params: {
  //     snapId: defaultSnapOrigin,
  //     request: { method: 'aa_state' },
  //   },
  // })) as {
  //   address: string;
  //   balance: string;
  //   secondOwner: string;
  //   deployed: boolean;
  // };

  const { address, balance, secondOwner, deployed } = await getAAStateSnap();
  return { address, balance, secondOwner, deployed };
};

export const create2FaWallet = async (credential: string) => {
  const { pkpPublicKey, pkpEthAddress } = await mintPKPWithCredential({
    credential,
  });
  // const pkpEthAddress = '0x45D9C129B35f46310e4962bD92A1803998b9294b';
  // const pkpPublicKey = '';
  console.log('pkpPublicKey', pkpPublicKey);
  console.log('pkpEthAddress', pkpEthAddress);
  const txHash = await set2FaSnap(pkpEthAddress);
  console.log('txHash', txHash);
  return pkpPublicKey;
};

export const setupSocialRecovery = async ({
  targetAddress,
  ipfsCid,
}: {
  targetAddress: string;
  ipfsCid: string;
}) => {
  const { pkpPublicKey, pkpEthAddress } = await mintPKPWithIpfsCid({ ipfsCid });
  const txHash = setupSocialRecoverySnap({
    targetAddress,
    proverAddress: pkpEthAddress,
  });
  return { pkpPublicKey, pkpEthAddress, txHash };
};

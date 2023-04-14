/* eslint-disable @typescript-eslint/default-param-last */
import { JsonRpcProvider } from '@ethersproject/providers';

import {
  EntryPoint__factory,
  // SimpleAccountFactory__factory,
} from '@account-abstraction/contracts';

import { Signer } from '@ethersproject/abstract-signer';
import Debug from 'debug';
import {
  ClientConfig,
  SimpleAccountAPI,
  ERC4337EthersProvider,
  HttpRpcClient,
} from '@account-abstraction/sdk';
// import { DeterministicDeployer } from '@account-abstraction/sdk/DeterministicDeployer';

const debug = Debug('aa.wrapProvider');

/**
 * wrap an existing provider to tunnel requests through Account Abstraction.
 *
 * @param originalProvider - the normal provider
 * @param config - see ClientConfig for more info
 * @param originalSigner - use this signer as the owner. of this wallet. By default, use the provider's signer
 * @param factoryAddress
 */
export async function myWrapProvider(
  originalProvider: JsonRpcProvider,
  config: ClientConfig,
  originalSigner: Signer = originalProvider.getSigner(),
  factoryAddress: string,
): Promise<ERC4337EthersProvider> {
  const entryPoint = EntryPoint__factory.connect(
    config.entryPointAddress,
    originalProvider,
  );

  const smartAccountAPI = new SimpleAccountAPI({
    provider: originalProvider,
    entryPointAddress: entryPoint.address,
    owner: originalSigner,
    factoryAddress,
    paymasterAPI: config.paymasterAPI,
  });
  debug('config=', config);
  const chainId = await originalProvider
    .getNetwork()
    .then((net) => net.chainId);
  const httpRpcClient = new HttpRpcClient(
    config.bundlerUrl,
    config.entryPointAddress,
    chainId,
  );
  return await new ERC4337EthersProvider(
    chainId,
    config,
    originalSigner,
    originalProvider,
    httpRpcClient,
    entryPoint,
    smartAccountAPI,
  ).init();
}

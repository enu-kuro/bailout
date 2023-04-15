# Bailout

Bailout is a security pipeline that securely moves assets between EOA, Contract Wallet, and Cold Wallet. In order for individual investors to securely handle EOAs such as MetaMask, Bailout provides Contract Wallet where main assets can be stored and the function to eject assets to Cold Wallet with a single click even in case of loss of the private key.

## How to build

#### 1. Install Packages
```bash
$ yarn install
```

#### 2. Change the file `./packages/site/src/utils/lit.ts`
To build, please note that we have encountered a strange Webpack build bug when building the @lit-protocol SDK in the normal way. 
```typescript
...
// ↓comment out
// import * as LitJsSdk from '@lit-protocol/lit-node-client';

// ↓uncomment out
const LitJsSdk = {} as any;
...
```

#### 3. Run 
```bash
$ yarn start
```

Once the app starts, you can revert the changes and Webpack will rebuild the app without errors.  

To enable Google authentication, also run `yarn start` in the `./google-auth` directory.

## 2 Factor Authentication

### Setting up 2FA

***
To set up 2FA, create a private key less MPC wallet utilizing Lit Protocol.
Actually it's not a private key less: the Lit nodes manage private keys in a distributed manner. 
Users can sign transactions with this private key using Web2 Auth like Google. 
Set the ETH address of the wallet contract as the 2FA address.
***

To mint PKP for 2FA, use mintPKPWithCredential:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/lit.ts#L85


To set the 2FA address to the AA contract, use set2Fa:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/aaWallet.ts#L85


Note that the first contract call always fails for some reason, so we need to call it twice. The first call is to transfer 0 ETH to itself for simply activating the deployment process.


### Verifying 2FA
***
Our approach is to concatenate the signatures of the EOA and the 2FA PKP and put them in the signature field of the UserOp. On the contract side, we will split them and verify the signature of the EOA and the 2FA PKP separately."
***

To verify 2FA, create an Unsigned UserOp using createUnsignedUserOp:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/aaWallet.ts#L151

Sign this Unsigned UserOp with the 2FA PKP using signWithPkp:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/utils/lit.ts#L72

Sign this Unsigned Userop with EOA and concatenate both signatures and send the transaction to the bundler using transfer:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/aaWallet.ts#L193

The contract-side implementation of 2FA (multisig) verification is in _validateSignature and extractECDSASignature function. The implementation is not fully completed and is currently commented out.  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/account-abstraction/contracts/samples/WalletAccount.sol#L211

Note that 2FA is not yet implemented on the Contract side, so the verification process is currently skipped.

## (Gasless)Social Recovery
***
Our approach to social recovery involves creating a Lit Action that allows a PKP to sign a transaction only if specific Lens users (guardians) react to a specific publication. This transaction calls a function on the AA contract that moves all funds to the escaped address.

If you fund the PKP in advance, you can execute the social recovery function gaslessly. We believe this is a novel idea because when you need social recovery, you may not have any funds available.
***

### Setting up Social Recovery

To set up Social Recovery, users can use the Lit Action template provided in the following link:  
https://github.com/enu-kuro/bailout/blob/main/packages/site/src/utils/socialRecoveryLitAction.ts

Users can customize the parameters in the template to specify the guardian Lens users and the publication:  
```
  // Please rewrite the following variables!
  const publicationId = '0x1f5c-0x48';
  const guardianUserId = '0x01b411';
  // Your AA Wallet Address
  const targetAddress = '';
```

This transaction calls the social recovery function on the AA contract:  
```
        const txParams = {
          nonce: latestNonce,
          gasPrice: '0x6fc23ac00', // 30gewi
          gasLimit: '0xf4240', // 1000000wei max: 0.03eth
          to: targetAddress,
          chainId: 80001,
          data: '0x4deafa38',
        };
```

Mint PKP with the Lit Action Ipfs Hash:  
https://github.com/enu-kuro/bailout/blob/3ea03fa733b11d43cf715230e25a2b75e1cd2a9f/packages/site/src/snapMock/lit.ts#L77


Set the escape address and the social recovery PKP address to the AA contract:  
https://github.com/enu-kuro/bailout/blob/3ea03fa733b11d43cf715230e25a2b75e1cd2a9f/packages/site/src/snapMock/aaWallet.ts#L261


### Execute Social Recovery
To execute Social Recovery, execute the Lit Action, get the signed transaction, and send it to the blockchain:  
https://github.com/enu-kuro/bailout/blob/58321522fa1687b6adc4ee47f8f0b6d645723112/packages/site/src/utils/lit.ts#L117


On the contract side, the executeSocialRecovery function can only be called using the social recovery PKP:  
https://github.com/enu-kuro/bailout/blob/3ea03fa733b11d43cf715230e25a2b75e1cd2a9f/account-abstraction/contracts/samples/WalletAccount.sol#L159

(Note that this function currently only moves native tokens.)


## MetaMask Snaps

We conducted extensive research on previous MetaMask Snaps Hackathon products, and drew inspiration mainly from these two products while developing our product, Bailout. 

- AA Snap: Democratizing Account Abstraction  
https://metamask.io/news/developers/aa-snap-democratizing-account-abstraction/

- MPC Snap: Integrating Multi-Factor Authentication Into MetaMask  
https://metamask.io/news/developers/mpc-snap-integrating-multi-factor-authentication-into-metamask/


Our objective was to provide users with the same user experience as the current MetaMask wallet, while allowing them to use their AA wallet in a similar manner. However, we found that it was not feasible with the current MetaMask Snaps functionality.

In our case, we had to write some logic outside of the snap environment, such as Google Auth and Lit Protocol SDK. The biggest challenge, however, was that users and dapps couldn't use AA wallets in the same way as EOA normal accounts. It would be great if developers could extend MetaMask EOA by utilizing Account Abstraction, and users and dapps could use it in the same way as EOA normal accounts.

We believe that it's feasible to simply display the balance of AA wallets in the MetaMask UI, and that other security-related features, such as 2FA signing, could be implemented through a combination of MetaMask and AA wallet app. For instance, when dapps request signing, MetaMask could relay the request to the AA wallet app, users could approve the request in the AA wallet app, and the AA wallet app could then send the signature to MetaMask, which could finally respond to the dapp with the required signatures for ERC-1271.

### Implementation

Unfortunately, we were unable to solve the issue, "Illegal invocation", during ETHGlobal Tokyo.   
https://github.com/MetaMask/snaps-monorepo/issues/1345   
Therefore, we implemented all the logics outside of the Snap environment. All logics under the packages/site/src/snapMock directory are originally intended to be implemented within the Snap environment.


## Deployed on Polygon Mumbai 

https://mumbai.polygonscan.com/address/0x79c3f2676e471F937065044A4c7BE4BAe55eE892
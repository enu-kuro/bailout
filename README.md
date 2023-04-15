
## How to build?

Run `yarn install`.

To build, please note that we have encountered a strange Webpack build bug when building the @lit-protocol SDK in the normal way.  
To solve it, comment out the following line:  
`import * as LitJsSdk from '@lit-protocol/lit-node-client';`  
and add the following line in lit.ts:  
`const LitJsSdk = {} as any;`  
https://github.com/enu-kuro/bailout/blob/main/packages/site/src/utils/lit.ts

After making these changes, run yarn start.  
 Once the app starts, you can revert the changes and Webpack will rebuild the app without errors.  

To enable Google authentication, also run `yarn start` in the "/google-auth" directory.  


## 2 Factor Authentication

### Setting up 2FA

```
To set up 2FA, create a private key less MPC wallet utilizing Lit Protocol.
Actually it's not a private key less: the Lit nodes manage private keys in a distributed manner. 
Users can sign transactions with this private key using Web2 Auth like Google. 
Set the ETH address of the wallet contract as the 2FA address.
```

To mint PKP for 2FA, use mintPKPWithCredential:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/lit.ts#L85


To set the 2FA address to the AA contract, use set2Fa:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/aaWallet.ts#L85


Note that the first contract call always fails for some reason, so we need to call it twice. The first call is to transfer 0 ETH to itself for simply activating the deployment process.


### Verifying 2FA
```
Our approach is to concatenate the signatures of the EOA and the 2FA PKP and put them in the signature field of the UserOp. On the contract side, we will split them and verify the signature of the EOA and the 2FA PKP separately."
```

To verify 2FA, create an Unsigned UserOp using createUnsignedUserOp:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/aaWallet.ts#L151

Sign this Unsigned UserOp with the 2FA PKP using signWithPkp:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/utils/lit.ts#L72

Sign this Unsigned Userop with EOA and concatenate both signatures and send the transaction to the bundler using transfer:  
https://github.com/enu-kuro/bailout/blob/d644b2dddb5fef3014d67e804493be8c72c12cc5/packages/site/src/snapMock/aaWallet.ts#L193

Note that 2FA is not yet implemented on the Contract side, so the verification process is currently skipped.

## Social Recovery
```
Our approach to social recovery involves creating a Lit Action that allows a PKP to sign a transaction only if specific Lens users (guardians) react to a specific publication. This transaction calls a function on the AA contract that moves all funds to the escaped address.

If you fund the PKP in advance, you can execute the social recovery function gaslessly. We believe this is a novel idea because when you need social recovery, you may not have any funds available.
```

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



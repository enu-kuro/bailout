
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



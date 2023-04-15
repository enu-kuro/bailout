export const socialRecoveryLitAction = `
(() => {
  // Please rewrite the following variables!
  const publicationId = '0x1f5c-0x48';
  const guardianUserId = '0x01b411';
  // Your AA Wallet Address
  const targetAddress = '';

  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) =>
        x.done
          ? resolve(x.value)
          : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // lit_actions/src/lens.action.ts
  (() =>
    __async(void 0, null, function* () {

      const query = \`
  query WhoReactedPublication {
    whoReactedPublication(request: { publicationId: "\${publicationId}" }) {
      items {
        profile {
          id
        }
      }
    }
  }
\`;
      try {
        const response = yield fetch('https://api.lens.dev/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = yield response.json();
        const guardianItem = data.data.whoReactedPublication.items.filter(
          (item) => item.profile.id === guardianUserId,
        );
        if (guardianItem.length === 0) {
          throw new Error('guardian not found');
        }
        const fromAddress = ethers.utils.computeAddress(publicKey);
        const latestNonce = yield LitActions.getLatestNonce({
          address: fromAddress,
          chain: 'mumbai',
        });
        const txParams = {
          nonce: latestNonce,
          gasPrice: '0x6fc23ac00', // 30gewi
          gasLimit: '0xf4240', // 1000000wei max: 0.03eth
          to: targetAddress,
          chainId: 80001,
          data: '0x4deafa38',
        };
        LitActions.setResponse({ response: JSON.stringify(txParams) });
        const serializedTx = ethers.utils.serializeTransaction(txParams);
        const rlpEncodedTxn = ethers.utils.arrayify(serializedTx);
        const unsignedTxn = ethers.utils.arrayify(
          ethers.utils.keccak256(rlpEncodedTxn),
        );
        const sigShare = yield LitActions.signEcdsa({
          toSign: unsignedTxn,
          publicKey,
          sigName,
        });
      } catch (error) {
        console.error(error);
      }
    }))();
})();
`;

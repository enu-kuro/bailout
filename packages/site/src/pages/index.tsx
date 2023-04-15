import { useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { BaseProvider } from '@metamask/providers';
import MonacoEditor from '@monaco-editor/react';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  ChainId,
  changeNetwork,
  connectSnap,
  getBalance,
  getAddress,
  getSnap,
  // sendHello,
  shouldDisplayReconnectButton,
  getAAState,
  create2FaWallet,
  set2FaPkpPublicKey,
  setupSocialRecovery,
  setSocialRecoveryPkpEthAddress,
  setPkpIpfsCid,
  setSocialRecoveryPkpPublicKey,
  socialRecoveryLitAction,
  executeSocialRecovery,
  signWithPkp,
  get2FaPkpPublicKey,
  createUnsignedUserOp,
  transfer,
  getSocialRecoveryPkpPublicKey,
  getPkpIpfsCid,
} from '../utils';
import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  // SendHelloButton,
  Card,
} from '../components';
import {
  Button,
  CardContainer,
  Container,
  ErrorMessage,
  Heading,
  Input,
  Notice,
  Span,
  Subtitle,
  Title,
} from '../components/StyledComponents';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

const DEFAULT_LIT_ACTION = socialRecoveryLitAction;
const DEFAULT_LIT_ACTION_IPFS_CID = '';
const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [aaAddress, setAaAddress] = useState('');
  const [aaBalance, setAABalance] = useState('');
  const [aaSecondOwner, setAASecondOwner] = useState<string | null>();
  const [aaDeployed, setAADeployed] = useState<boolean>();
  const [targetAddress, setTargetAddress] = useState('');
  const [sendValue, setSendValue] = useState(0.001);
  const [publicationId, setPublicationId] = useState('');
  const [guardingUserId, setGuardingUserId] = useState('');
  const [ipfsCid, setIpfsCid] = useState(DEFAULT_LIT_ACTION_IPFS_CID);
  const [socialRecoveryAddress, setSocialRecoveryAddress] = useState('');
  const [code, setCode] = useState(DEFAULT_LIT_ACTION);
  const [aaSocialRecoveryProverAddress, setAASocialRecoveryProverAddress] =
    useState<string | null>();
  const [aaEscapeAddress, setAAEscapeAddress] = useState<string | null>();

  const {
    googleLogin,
    googleCredential,
    status: googleLoginStatus,
  } = useGoogleAuth();

  useEffect(() => {
    const init = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(
          window.ethereum as BaseProvider,
        );
        await provider.send('eth_requestAccounts', []);
        // await changeNetwork(ChainId.mumbai);
        // await changeNetwork(ChainId.lit);
      } catch (e) {
        console.error(e);
        dispatch({ type: MetamaskActions.SetError, payload: e });
      }
    };
    init();
  }, []);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleCheckAAStateClick = async () => {
    console.log('handleCheckAAStateClick');
    const {
      address,
      balance,
      secondOwner,
      deployed,
      socialRecoveryProverAddress,
      escapeAddress,
    } = await getAAState();
    console.log(
      'aa status',
      address,
      ethers.utils.formatEther(balance),
      secondOwner,
      deployed,
    );
    setAASecondOwner(secondOwner);
    setAaAddress(address);
    setAABalance(balance);
    setAADeployed(deployed);
    setAASocialRecoveryProverAddress(socialRecoveryProverAddress);
    setAAEscapeAddress(escapeAddress);
  };

  const handle2FaClick = async () => {
    console.log('handle2FaClick');
    if (!googleCredential?.id_token) {
      googleLogin();
    } else {
      // TODO: mint pkp
      const pkpPublicKey = await create2FaWallet(googleCredential.id_token);
      set2FaPkpPublicKey(pkpPublicKey);
    }
  };

  useEffect(() => {
    const set2Fa = async () => {
      if (!googleCredential?.id_token) {
        return;
      }
      const pkpPublicKey = await create2FaWallet(googleCredential.id_token);
      set2FaPkpPublicKey(pkpPublicKey);
    };

    set2Fa();
  }, [googleCredential?.id_token]);

  const onEdit = (_code: string) => {
    setCode(_code);
  };

  const handleTransferClick = async () => {
    console.log('handleTransferClick');
    if (!googleCredential?.id_token) {
      dispatch({
        type: MetamaskActions.SetError,
        payload: Error('Google credential is not available'),
      });
      // googleLogin();
      return;
    }

    if (!ethers.utils.isAddress(targetAddress)) {
      dispatch({
        type: MetamaskActions.SetError,
        payload: Error(`Address "${targetAddress}" is not valid`),
      });
    }
    const { userOpHash, userOp } = await createUnsignedUserOp({
      targetAddress,
      sendValue,
    });
    console.log(userOpHash);

    const pkpSignature = await signWithPkp({
      message: userOpHash,
      pkpPublicKey: get2FaPkpPublicKey(),
      accessToken: googleCredential.id_token,
    });

    const txHash = await transfer({ userOp, signature: pkpSignature });
    console.log('txHash', txHash);
  };

  const handleSetupSocialRecoveryClick = async () => {
    console.log('handleSetupSocialRecoveryClick');
    if (ipfsCid === '' || socialRecoveryAddress === '') {
      dispatch({
        type: MetamaskActions.SetError,
        payload: Error('IPFS CID or targetAddress is not available'),
      });
      return;
    }
    const { pkpPublicKey, pkpEthAddress, txHash } = await setupSocialRecovery({
      socialRecoveryAddress,
      ipfsCid,
    });
    console.log('txHash', txHash);
    console.log('pkpPublicKey', pkpPublicKey);
    console.log('pkpEthAddress', pkpEthAddress);
    setSocialRecoveryPkpEthAddress(pkpEthAddress);
    setSocialRecoveryPkpPublicKey(pkpPublicKey);
    setPkpIpfsCid(ipfsCid);
  };

  const handleExecuteSocialRecoveryClick = async () => {
    console.log('handleExecuteSocialRecoveryClick');

    const socialRecoveryPkpPublicKey = getSocialRecoveryPkpPublicKey();
    const socialRecoveryIpfsCid = getPkpIpfsCid();
    if (socialRecoveryIpfsCid === '' || socialRecoveryPkpPublicKey === '') {
      dispatch({
        type: MetamaskActions.SetError,
        payload: Error(
          'socialRecoveryIpfsCid or socialRecoveryPkpPublicKey  is not available',
        ),
      });
      return;
    }
    const socialRecoveryReceipt = await executeSocialRecovery({
      pkpPublicKey: socialRecoveryPkpPublicKey,
      ipfsId: socialRecoveryIpfsCid,
    });
    console.log('socialRecoveryReceipt', socialRecoveryReceipt);
  };
  return (
    <Container>
      <Heading>
        Welcome to <Span>template-snap</Span>
      </Heading>
      <Subtitle>
        Get started by editing <code>src/index.ts</code>
      </Subtitle>
      <Notice>
        <Title>Your Bailout Account🔥</Title>
        <div>Address: {aaAddress}</div>
        <div>
          Balance: {aaBalance !== '' && ethers.utils.formatEther(aaBalance)}
        </div>
        <div>
          deployed: {aaDeployed !== undefined ? aaDeployed.toString() : ''}
        </div>
        <div>2FA: {aaSecondOwner}</div>
        <div>Social Recovery Prover: {aaSocialRecoveryProverAddress}</div>
        <div>Social Recovery Escape Address: {aaEscapeAddress}</div>
      </Notice>
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!state.isFlask && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!state.isFlask}
                />
              ),
            }}
            disabled={!state.isFlask || true}
          />
        )}
        {shouldDisplayReconnectButton(state.installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
              button: (
                <ReconnectButton
                  onClick={handleConnectClick}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
          />
        )}
        <Card
          content={{
            title: 'Check Address & Balance',
            description: 'You have to fund this address first',
            button: (
              <Button
                onClick={handleCheckAAStateClick}
                // disabled={!state.installedSnap}
              >
                Bailout Account status
              </Button>
            ),
          }}
          // disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: '2FA',
            description: 'Set 2 factor auth',
            button: (
              <Button
                onClick={handle2FaClick}
                // disabled={!state.installedSnap}
              >
                Setup 2FA
              </Button>
            ),
          }}
          // disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Transfer',
            description: 'Transfer from Bailout Account',
            button: (
              <>
                <label>
                  Send to:
                  <Input
                    type="text"
                    placeholder="target address"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                  />
                </label>
                <label>
                  Value:
                  <Input
                    type="number"
                    placeholder="target address"
                    value={sendValue}
                    onChange={(e) => setSendValue(Number(e.target.value))}
                  />
                </label>
                <Button
                  onClick={handleTransferClick}
                  // disabled={!state.installedSnap}
                >
                  Transfer
                </Button>
              </>
            ),
          }}
          // disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Social Recovery',
            description: 'setup social recovery',
            button: (
              <div>
                <div>
                  <label>
                    Publication ID:
                    <Input
                      type="text"
                      placeholder="0x01-0x01"
                      value={publicationId}
                      onChange={(e) => setPublicationId(e.target.value)}
                    />
                  </label>
                  <label>
                    Guardian User ID:
                    <Input
                      type="text"
                      placeholder="0x45ba"
                      value={guardingUserId}
                      onChange={(e) => setGuardingUserId(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Lit Action
                  <MonacoEditor
                    language="javascript"
                    onChange={(_code) => onEdit(_code || '')}
                    value={code}
                    theme="vs-dark"
                    height="300px"
                  />
                </label>
                <Button
                  onClick={() => {
                    window.open(
                      'https://explorer.litprotocol.com/create-action',
                      '_blank',
                    );
                  }}
                  // disabled={!state.installedSnap || googleCredential?.id_token}
                >
                  Upload Lit Action
                </Button>
                <label>
                  IPFS CID:
                  <Input
                    type="text"
                    placeholder="0x45ba"
                    value={ipfsCid}
                    onChange={(e) => setIpfsCid(e.target.value)}
                  />
                </label>
                <label>
                  Social Recovery Address
                  <Input
                    type="text"
                    placeholder="0x0000000000000000000000000000000000000000"
                    value={socialRecoveryAddress}
                    onChange={(e) => setSocialRecoveryAddress(e.target.value)}
                  />
                </label>
                <Button
                  onClick={handleSetupSocialRecoveryClick}
                  // disabled={!socialRecoveryAddress || !ipfsCid}
                >
                  Setup Social Recovery
                </Button>
              </div>
            ),
          }}
          // disabled={!state.installedSnap}
          fullWidth={true}
        />
        <Card
          content={{
            title: 'Execute Social Recovery',
            description: 'Send fund to social recovery address',
            button: (
              <Button
                onClick={handleExecuteSocialRecoveryClick}
                // disabled={!state.installedSnap || googleCredential?.id_token}
              >
                Excute
              </Button>
            ),
          }}
          // disabled={!state.installedSnap}
        ></Card>
        <Notice>
          <p>
            Please note that the <b>snap.manifest.json</b> and{' '}
            <b>package.json</b> must be located in the server root directory and
            the bundle must be hosted at the location specified by the location
            field.
          </p>
        </Notice>
      </CardContainer>
    </Container>
  );
};

export default Index;

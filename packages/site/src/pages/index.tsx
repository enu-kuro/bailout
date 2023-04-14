import { useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { BaseProvider } from '@metamask/providers';
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

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [aaAddress, setAaAddress] = useState('');
  const [aaBalance, setAABalance] = useState('');
  const [aaSecondOwner, setAASecondOwner] = useState<string | null>();
  const [aaDeployed, setAADeployed] = useState<boolean>();
  const [targetAddress, setTargetAddress] = useState('');
  const [sendValue, setSendValues] = useState(0.001);

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
    const { address, balance, secondOwner, deployed } = await getAAState();
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
    const init = async () => {
      // TODO: mint pkp

      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const pkpPublicKey = await create2FaWallet(googleCredential!.id_token!);
        set2FaPkpPublicKey(pkpPublicKey);
      } catch (e) {
        console.error(e);
      }
    };

    if (googleCredential?.id_token) {
      init();
    }
  }, [googleCredential?.id_token]);

  const handleTransferClick = async () => {
    console.log('handleTransferClick');
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
            disabled={!state.isFlask}
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
                <label>Value: {sendValue}</label>
                <Button
                  onClick={handleTransferClick}
                  disabled={!state.installedSnap}
                >
                  Transfer
                </Button>
              </>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
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

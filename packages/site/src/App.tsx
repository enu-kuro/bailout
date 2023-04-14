import { FunctionComponent, ReactNode, useContext } from 'react';
import styled from 'styled-components';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Footer, Header } from './components';
import { GlobalStyle } from './config/theme';
import { ToggleThemeContext } from './Root';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  max-width: 100vw;
`;

export type AppProps = {
  children: ReactNode;
};

export const App: FunctionComponent<AppProps> = ({ children }) => {
  const toggleTheme = useContext(ToggleThemeContext);

  return (
    <>
      <GoogleOAuthProvider clientId="995617933623-72vqltam4g5g7v4u6vtgaciki4ujap1n.apps.googleusercontent.com">
        <GlobalStyle />
        <Wrapper>
          <Header handleToggleClick={toggleTheme} />
          {children}
          <Footer />
        </Wrapper>
      </GoogleOAuthProvider>
    </>
  );
};

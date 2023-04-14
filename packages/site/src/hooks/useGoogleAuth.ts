import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Credentials } from 'google-auth-library';

export const useGoogleAuth = () => {
  const [googleCredential, setGoogleCredential] = useState<Credentials | null>(
    null,
  );
  const [status, setStatus] = useState('');

  const googleLogin = useGoogleLogin({
    onSuccess: async ({ code }) => {
      setStatus('Logged in to Google');

      const response = await fetch('http://localhost:3001/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const tokens = (await response.json()) as Credentials;
      console.log(tokens);
      setGoogleCredential(tokens);
    },
    onError: () => {
      console.log('Login Failed');
    },
    flow: 'auth-code',
  });
  return { googleLogin, googleCredential, status };
};

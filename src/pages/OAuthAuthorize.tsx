import React, { useEffect, useRef, useState } from 'react';

function getPortalToken() {
  const candidateKeys = ['token', 'accessToken', 'jwtToken', 'access_token', 'jwt', 'authToken', 'ims_token'];
  for (const key of candidateKeys) {
    const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    if (!raw) continue;
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        const nested = parsed.token || parsed.accessToken || parsed.access_token || parsed?.state?.token;
        if (nested) return nested;
      } catch { /* not JSON */ }
      continue;
    }
    return raw;
  }
  return null;
}

function goToLogin() {
  const returnTo = window.location.pathname + window.location.search;
  window.location.assign(`/login?redirect=${encodeURIComponent(returnTo)}`);
}

const AUTHORIZE_ENDPOINT = '/api/oauth/authorize';

const OAUTH_PARAMS = [
  'response_type', 'client_id', 'redirect_uri', 'state',
  'code_challenge', 'code_challenge_method', 'scope',
];

export default function OAuthAuthorize() {
  const [status, setStatus] = useState<'working' | 'error' | 'leaving'>('working');
  const [error, setError] = useState<{ error?: string; error_description?: string; redirect_to?: string } | null>(null);

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const search = new URLSearchParams(window.location.search);
      const params: Record<string, string> = {};
      for (const key of OAUTH_PARAMS) {
        const value = search.get(key);
        if (value !== null) params[key] = value;
      }

      const token = getPortalToken();
      if (!token) {
        goToLogin();
        return;
      }

      let response;
      let body;
      try {
        response = await fetch(AUTHORIZE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });
        body = await response.json();
      } catch {
        setError({
          error: 'server_error',
          error_description: 'Could not reach the portal. Check your connection and try again.',
        });
        setStatus('error');
        return;
      }

      if (response.status === 401) {
        goToLogin();
        return;
      }

      if (body && body.redirect_to) {
        setStatus('leaving');
        window.location.replace(body.redirect_to);
        return;
      }

      setError({
        error: (body && body.error) || 'invalid_request',
        error_description: (body && body.error_description) || 'This sign-in request was refused.',
      });
      setStatus('error');
    })();
  }, []);

  const shell: React.CSSProperties = {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  };
  const card: React.CSSProperties = { maxWidth: '26rem', textAlign: 'center', lineHeight: 1.5 };

  if (status === 'error') {
    return (
      <div style={shell}>
        <div style={card} role="alert">
          <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', color: '#dc2626' }}>Sign-in was refused</h1>
          <p style={{ margin: '0 0 1rem', color: '#4b5563' }}>{error?.error_description}</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9ca3af' }}>
            Error code: <code>{error?.error}</code>
          </p>
          <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
            Close this window and start sign-in again from the Prome Suite app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', color: '#1f2937' }}>
          {status === 'leaving' ? 'Returning to Prome Suite…' : 'Signing you in…'}
        </h1>
        <p style={{ margin: 0, color: '#4b5563' }}>
          {status === 'leaving'
            ? 'Your browser may ask for permission to open the Prome Suite app.'
            : 'One moment while the portal authorizes the desktop app.'}
        </p>
      </div>
    </div>
  );
}

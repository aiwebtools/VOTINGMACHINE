'use client';
import { useEffect, useState } from 'react';

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const m = (window.location.hash || '').match(/session_id=([^&]+)/);
    const vote = new URLSearchParams(window.location.search).get('vote');
    if (!m) { setError('No Google session found. Please try signing in again.'); return; }
    fetch('/api/auth/oauth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: decodeURIComponent(m[1]) }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Google sign-in failed');
        localStorage.setItem('vv_token', d.token);
        window.location.replace(vote ? `/?vote=${encodeURIComponent(vote)}` : '/');
      })
      .catch(e => setError(e.message));
  }, []);

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="card-neon w-full max-w-md rounded-2xl p-8 text-center">
        {!error ? (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <div className="text-lg font-bold text-white">Verifying your identity…</div>
            <div className="mt-1 text-sm text-gray-400">Securely signing you in with Google</div>
          </>
        ) : (
          <>
            <div className="mb-3 text-4xl">⚠️</div>
            <div className="mb-2 text-lg font-bold text-red-300">{error}</div>
            <a href="/" className="btn-blue mt-4 inline-block rounded-lg px-6 py-3 text-sm font-black tracking-widest text-white">BACK TO VOTEVAULT</a>
          </>
        )}
      </div>
    </div>
  );
}

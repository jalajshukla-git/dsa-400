import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { signUp, signInWithGitHub, configured } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [ghBusy, setGhBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!configured) { nav('/'); return; }
    setBusy(true); setErr(''); setOk('');
    const { session, error } = await signUp(email, pw, username);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (!session) { setOk('Check your inbox to confirm your email, then sign in.'); return; }
    nav('/onboarding');
  };

  const github = async () => {
    setErr(''); setGhBusy(true);
    const { error } = await signInWithGitHub();
    if (error) { setErr(error.message); setGhBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-logo"><span className="brand-mark">◈</span> DSA·400</div>
        <div className="auth-sub">Create your account — the 400 days start here</div>
        {!configured && (
          <div className="notice">
            Supabase is not connected yet — add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env</code> file. Meanwhile you can
            explore in demo mode.
          </div>
        )}
        {err && <div className="auth-err">{err}</div>}
        {ok && <div className="auth-ok">{ok}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="your-name" required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="at least 6 characters" required minLength={6} autoComplete="new-password" />
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <div className="auth-divider"><span>or continue with</span></div>
        <button className="btn btn-github btn-lg" style={{ width: '100%' }} onClick={github} disabled={ghBusy}>
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
          {ghBusy ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-mute)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

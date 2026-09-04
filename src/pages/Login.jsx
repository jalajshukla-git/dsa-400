import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pickQuote } from '../lib/quotes';

export default function Login() {
  const { signIn, configured } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [quote] = useState(() => pickQuote());

  const params = new URLSearchParams(loc.search);
  const returnTo = params.get('return') || loc.state?.from || '/';

  const submit = async e => {
    e.preventDefault();
    if (!configured) { nav(returnTo); return; }
    setBusy(true); setErr('');
    const { error } = await signIn(email, pw);
    setBusy(false);
    if (error) setErr(error.message);
    else nav(returnTo);
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-logo"><span className="brand-mark">◈</span> DSA·400</div>
        <div className="auth-sub">Sign in to your consistency engine</div>
        <div className="quote-card">“{quote}”</div>
        {!configured && (
          <div className="notice">
            Supabase is not connected yet — add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env</code> file. Meanwhile you can explore in demo mode.
          </div>
        )}
        {err && <div className="auth-err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></div>
          <div className="field"><label>Password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required autoComplete="current-password" /></div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-mute)' }}>
          No account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}

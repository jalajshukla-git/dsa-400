import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { signUp, configured } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

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
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-mute)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

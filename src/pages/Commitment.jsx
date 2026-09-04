import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTrackerData } from '../hooks/useTrackerData';
import { TRACKER_DATA } from '../lib/tracker-data';
import CommitmentCard from '../components/CommitmentCard';
import { pretty, todayIso, dayDiff } from '../lib/utils';
import { pickQuote } from '../lib/quotes';

const DAYS = TRACKER_DATA.days;
const UNITS = TRACKER_DATA.units;

export default function Commitment() {
  const { hash } = useParams();
  const { user, loading: authLoading, signIn, configured } = useAuth();
  const s = useTrackerData();

  const [data, setData] = useState(null);      // verification result
  const [status, setStatus] = useState('loading'); // loading | notfound | nodb | ok
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [quote] = useState(() => pickQuote());

  useEffect(() => {
    let alive = true;
    if (!configured) { setStatus('nodb'); return; }
    supabase.rpc('get_commitment_verification', { p_hash: hash }).then(({ data: r, error }) => {
      if (!alive) return;
      if (error || !r || !r.found) { setStatus('notfound'); return; }
      setData(r);
      setStatus('ok');
    });
    return () => { alive = false; };
  }, [hash, configured, user?.id]);

  const isOwner = Boolean(user && (data?.is_owner || s.commitment?.hash === hash));

  const doLogin = async e => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await signIn(email, pw);
    setBusy(false);
    if (error) setErr(error.message);
  };

  /* ── derived owner stats ── */
  const owner = useMemo(() => {
    if (!s.commitment) return null;
    const start = s.commitment.start_date;
    const activeDays = DAYS.filter(d => !s.excluded[d.id]).length || 1;
    const sealed = DAYS.filter(d => !s.excluded[d.id] && s.sealed[d.id]).length;
    const pct = Math.round(100 * sealed / activeDays);
    const daysElapsed = Math.max(1, Math.min(400, dayDiff(todayIso(), start) + 1));
    const expected = Math.round(activeDays * daysElapsed / 400);
    const ahead = sealed - expected;
    const remaining = activeDays - sealed;
    const perDay = sealed / daysElapsed;
    const etaDays = perDay > 0 ? Math.ceil(remaining / perDay) : null;
    const solvedList = [];
    for (const d of DAYS) {
      d.items.forEach((it, i) => {
        if (s.done[`${d.id}:${i}`]) solvedList.push({ title: it.n, day: d.id, url: it.u });
      });
    }
    s.extras.filter(e => e.status === 'done').forEach(e => solvedList.push({ title: e.title, day: e.target_day, url: e.url }));
    return { activeDays, sealed, pct, daysElapsed, ahead, remaining, etaDays, solvedList };
  }, [s]);

  const progress = owner ? { sealed: owner.sealed, activeDays: owner.activeDays, streak: s.streak, best: s.best, solved: s.solvedCount } : null;

  /* ── 403 ── */
  if (status === 'notfound') {
    return (
      <div className="auth-wrap">
        <div className="card auth-card" style={{ textAlign: 'center' }}>
          <div className="code403">403</div>
          <div className="card-t">Commitment not accessible</div>
          <p className="card-d">This hash doesn't match any commitment, or you don't have permission to view it.</p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/login">Sign in</Link>
            <Link className="btn btn-ghost" to="/">Go home</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── no supabase ── */
  if (status === 'nodb') {
    return (
      <div className="wrap sec" style={{ maxWidth: 720 }}>
        <div className="notice">Supabase is not connected — connect via <code>.env</code> to enable hash verification.</div>
        <div className="code403">403</div>
      </div>
    );
  }

  if (status === 'loading' || authLoading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-mute)' }}>VERIFYING…</div>;
  }

  /* ── not logged in → beautiful login ── */
  if (!user) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <div className="auth-logo"><span className="brand-mark">◈</span> DSA·400</div>
          <div className="auth-sub">Sign in to verify this commitment</div>
          <div className="quote-card">“{quote}”</div>
          {err && <div className="auth-err">{err}</div>}
          <form onSubmit={doLogin}>
            <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
            <div className="field"><label>Password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} required autoComplete="current-password" /></div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in & verify'}</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--text-mute)' }}>
            No account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── owner view ── */
  if (isOwner && !s.ready) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-mute)' }}>LOADING YOUR RECORD…</div>;
  }
  if (isOwner && owner) {
    return (
      <div className="wrap sec" style={{ maxWidth: 960 }}>
        <div className="sec-head">
          <span className="sec-num">Your commitment · verified</span>
          <h2>“{s.commitment.statement}”</h2>
          <p className="sub">
            {s.commitment.commit_id} · Start <b>{pretty(s.commitment.start_date)}</b> → End <b>{pretty(s.commitment.end_date)}</b>
          </p>
        </div>

        <CommitmentCard commitment={s.commitment} username={user?.user_metadata?.username || user?.email?.split('@')[0]} progress={progress} />

        {/* analysis */}
        <div className="prog-grid" style={{ marginTop: 20 }}>
          <div className="card metric"><div className="ml">Journey</div><div className="mv">{owner.pct}<small>%</small></div></div>
          <div className="card metric"><div className="ml">Days sealed</div><div className="mv">{owner.sealed}<small>/{owner.activeDays}</small></div></div>
          <div className="card metric"><div className="ml">Solved</div><div className="mv">{s.solvedCount}</div></div>
          <div className="card metric"><div className="ml">Streak</div><div className="mv">{s.streak}<small> d</small></div></div>
          <div className="card metric"><div className="ml">Days left</div><div className="mv">{owner.remaining}</div></div>
        </div>

        <div className="card analysis" style={{ marginTop: 14 }}>
          <div className="card-t">Where you can go</div>
          <p className="card-d">
            You're <b style={{ color: owner.ahead >= 0 ? 'var(--ok)' : 'var(--warn)' }}>
            {owner.ahead >= 0 ? `${owner.ahead} day${owner.ahead === 1 ? '' : 's'} ahead` : `${-owner.ahead} day${owner.ahead === -1 ? '' : 's'} behind`}</b>.
            {owner.etaDays != null ? <> At this pace you finish in <b>{owner.etaDays} days</b>.</> : <> Seal your first day and your finish line appears.</>}
          </p>
          <div className="quote-line">“{quote}”</div>
        </div>

        {/* weeks */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-t">Your weeks</div>
          <div className="unit-map">
            {UNITS.map((u, i) => {
              const days = u.days.map(d => DAYS[d - 1]).filter(d => !s.excluded[d.id]);
              const n = days.filter(d => s.sealed[d.id]).length;
              const p = days.length ? Math.round(100 * n / days.length) : 0;
              return (
                <div key={i} className="ub" style={{ cursor: 'default' }}>
                  <span className="ub-n">{n}/{days.length}</span>
                  <div className="ub-t">{u.title}</div>
                  <div className="ub-b"><i style={{ width: p + '%' }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* solved list */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-t">Questions solved ({owner.solvedList.length})</div>
          <div className="solved-list">
            {owner.solvedList.length === 0 && <p className="card-d">Nothing solved yet — your first tick starts the chain.</p>}
            {owner.solvedList.map((q, i) => (
              <span key={i} className="solved-pill">
                {q.url ? <a href={q.url} target="_blank" rel="noopener noreferrer">{q.title}</a> : q.title}
                {q.day ? <em>D{q.day}</em> : null}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/profile">Open my profile</Link>
          <Link className="btn btn-ghost" to="/">Back to tracker</Link>
        </div>
      </div>
    );
  }

  /* ── public verification view (never shows the commit message) ── */
  const st = data.stats || {};
  if (isOwner && !owner) {
    return (
      <div className="wrap sec" style={{ maxWidth: 720 }}>
        <div className="card pub-verify">
          <span className="sec-num">Your commitment</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, margin: '8px 0' }}>No commitment found</h2>
          <p className="card-d">This hash is linked to your account, but we couldn't find the commitment record. Head to your profile to set it up.</p>
          <div style={{ marginTop: 14 }}><Link className="btn btn-primary" to="/profile">Open my profile</Link></div>
        </div>
      </div>
    );
  }
  const pct = st.active_days ? Math.round(100 * (st.sealed || 0) / st.active_days) : 0;
  return (
    <div className="wrap sec" style={{ maxWidth: 760 }}>
      <div className="card pub-verify">
        <span className="sec-num">Public verification</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, margin: '8px 0' }}>{data.username || 'someone'}</h2>
        <div className="cert-cid" style={{ display: 'inline-block', marginBottom: 12 }}>{data.commit_id || '—'}</div>
        <div className="cert-dates">
          <div className="cert-date"><span className="cert-l">Start date</span><span className="cert-v">{pretty(data.start_date)}</span></div>
          <span className="cert-arrow">→</span>
          <div className="cert-date"><span className="cert-l">End date</span><span className="cert-v">{pretty(data.end_date)}</span></div>
        </div>
        <p className="card-d" style={{ marginTop: 14 }}>
          This page verifies <b>consistency only</b>. The commitment statement stays private.
        </p>
        <div className="prog-grid" style={{ marginTop: 16 }}>
          <div className="card metric"><div className="ml">Consistency</div><div className="mv">{pct}<small>%</small></div></div>
          <div className="card metric"><div className="ml">Days sealed</div><div className="mv">{st.sealed}<small>/{st.active_days}</small></div></div>
          <div className="card metric"><div className="ml">Solved</div><div className="mv">{st.solved}</div></div>
          <div className="card metric"><div className="ml">Streak</div><div className="mv">{st.streak}<small> d</small></div></div>
        </div>
        <div className="quote-line" style={{ marginTop: 12 }}>“{quote}”</div>
        <div style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" to="/register">Start your own 400 days →</Link>
        </div>
      </div>
    </div>
  );
}

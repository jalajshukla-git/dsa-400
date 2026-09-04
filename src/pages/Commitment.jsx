import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, configured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CommitmentCard from '../components/CommitmentCard';
import { pretty } from '../lib/utils';

export default function Commitment() {
  const { hash } = useParams();
  const { user, loading } = useAuth();
  const [c, setC] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (loading || !configured || !user) return;
    supabase.from('commitment').select('*').eq('hash', hash).maybeSingle().then(({ data }) => {
      if (data) setC({ statement: data.statement, hash: data.hash, start_date: data.start_date, end_date: data.end_date });
      else setNotFound(true);
    });
  }, [hash, user, loading, configured]);

  return (
    <div className="wrap sec" style={{ maxWidth: 860 }}>
      <div className="auth-logo" style={{ justifyContent: 'flex-start' }}>
        <span className="brand-mark">◈</span> DSA·400 — commitment verification
      </div>

      {!configured && (
        <div className="notice" style={{ marginTop: 16 }}>
          Supabase not connected — commitment verification requires the database. Connect via <code>.env</code> and it will work end-to-end.
        </div>
      )}
      {configured && !loading && !user && (
        <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
          <div className="card-t">This commitment is locked</div>
          <p className="card-d" style={{ marginBottom: 14 }}>No one can view a commitment without signing in.</p>
          <Link className="btn btn-primary" to={`/login?return=/hash/${hash}`}>Sign in to verify</Link>
        </div>
      )}
      {configured && user && notFound && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-t">Commitment not found</div>
          <p className="card-d">No commitment matches hash <code>{hash}</code>.</p>
        </div>
      )}
      {configured && user && c && (
        <div style={{ marginTop: 16 }}>
          <div className="sec-head">
            <span className="sec-num">Verified · immutable</span>
            <h2>“{c.statement}”</h2>
            <p className="sub">Start <b>{pretty(c.start_date)}</b> → End <b>{pretty(c.end_date)}</b> · SHA-512 <code>{c.hash}</code></p>
          </div>
          <CommitmentCard commitment={c} username={user?.user_metadata?.username || user?.email} />
        </div>
      )}
      {configured && user && !c && !notFound && <div className="card-d" style={{ marginTop: 16 }}>Verifying…</div>}
    </div>
  );
}

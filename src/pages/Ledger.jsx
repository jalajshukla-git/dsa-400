import { useMemo, useState } from 'react';
import Nav from '../components/Nav';
import { useTrackerData } from '../hooks/useTrackerData';
import { toast } from '../lib/toast';

export default function Ledger() {
  const s = useTrackerData();
  const [view, setView] = useState('table');

  const json = useMemo(() => JSON.stringify({
    anchor: s.commitment?.start_date || null,
    generated_at: new Date().toISOString(),
    user: s.userId,
    counts: { sealed: s.sealedCount, solved: s.solvedCount, streak: s.streak, best: s.best },
    events: s.ledger,
  }, null, 2), [s]);

  const jsonl = useMemo(() => s.ledger.map(e => JSON.stringify(e)).join('\n'), [s.ledger]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(json); toast('Ledger JSON copied.'); } catch { toast('Copy failed.'); }
  };
  const download = (name, content) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!s.ready) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-mute)' }}>LOADING…</div>;

  return (
    <>
      <Nav />
      <div className="wrap sec">
        <div className="sec-head">
          <span className="sec-num">Raw ledger · /file</span>
          <h2>Your append-only event log</h2>
          <p className="sub">
            Every tick, seal, note and edit — server-stamped and impossible to rewrite. This is the
            data your account is built on; use it as an API-style export.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('table')}>Table</button>
          <button className={`btn btn-sm ${view === 'json' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('json')}>JSON</button>
          <button className={`btn btn-sm ${view === 'jsonl' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('jsonl')}>JSONL</button>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-soft btn-sm" onClick={copy}>Copy JSON</button>
            <button className="btn btn-soft btn-sm" onClick={() => download('ledger.json', json)}>Download .json</button>
            <button className="btn btn-soft btn-sm" onClick={() => download('ledger.jsonl', jsonl)}>Download .jsonl</button>
          </span>
        </div>

        {view === 'table' && (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>#</th><th>Time</th><th>Type</th><th>Day</th><th>Idx</th><th>Text</th></tr></thead>
              <tbody>
                {s.ledger.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--text-mute)' }}>No events yet.</td></tr>}
                {[...s.ledger].reverse().slice(0, 300).map(e => (
                  <tr key={e.id || e.ts}>
                    <td className="cx">{e.id ?? '—'}</td>
                    <td className="cx" style={{ whiteSpace: 'nowrap' }}>{new Date(e.ts).toLocaleString()}</td>
                    <td><span className="chip chip-neutral">{e.type}</span></td>
                    <td className="cx">{e.day ?? '—'}</td>
                    <td className="cx">{e.idx ?? '—'}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-dim)', wordBreak: 'break-word' }}>{e.text || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {view !== 'table' && (
          <pre className="ledger-pre">{view === 'json' ? json : jsonl}</pre>
        )}
      </div>
    </>
  );
}

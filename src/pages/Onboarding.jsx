import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackerData } from '../hooks/useTrackerData';
import { TRACKER_DATA } from '../lib/tracker-data';
import { todayIso, ymdForDay, pretty } from '../lib/utils';
import CommitmentCard from '../components/CommitmentCard';
import { toast } from '../lib/toast';

const UNITS = TRACKER_DATA.units;

export default function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const t = useTrackerData();

  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState(todayIso());
  const [statement, setStatement] = useState('');
  const [units, setUnits] = useState(() => new Set(UNITS.map((_, i) => i)));
  const [busy, setBusy] = useState(false);
  const [comm, setComm] = useState(t.commitment || null);

  const endDate = useMemo(() => ymdForDay(startDate, 400), [startDate]);
  const selCount = units.size;
  const ready = t.ready;
  const alreadyCommitted = Boolean(t.commitment && !comm);

  // already committed → straight to the tracker
  useEffect(() => { if (alreadyCommitted) nav('/'); }, [alreadyCommitted, nav]);

  if (!ready) return <div className="wrap sec" style={{ color: 'var(--text-mute)' }}>Loading…</div>;
  if (alreadyCommitted) return null;

  const toggleUnit = i => {
    const ns = new Set(units);
    if (ns.has(i)) ns.delete(i); else ns.add(i);
    setUnits(ns);
  };

  const finish = async () => {
    setBusy(true);
    try {
      const c = await t.setCommitment({ statement, startDate });
      // apply unit choices: everything not selected is excluded
      for (let i = 0; i < UNITS.length; i++) {
        if (!units.has(i)) await t.setUnitIncluded(i, false);
      }
      setComm(c);
      setStep(4);
      toast('<b>Commitment locked.</b> Your 400 days are anchored.');
    } catch (e) {
      toast('Could not save: ' + (e.message || 'error'));
    }
    setBusy(false);
  };

  return (
    <div className="onb-wrap wrap">
      <div className="sec-head">
        <span className="sec-num">Onboarding</span>
        <h2>Set up your 400 days</h2>
        <p className="sub">
          Step {Math.min(step + 1, 4)} of 4 · your start date is <b>permanent</b> — the calendar,
          the chain and the date-gating all derive from it.
        </p>
      </div>

      {/* step 1 — start date */}
      <div className={`card onb-step ${step === 0 ? 'on' : ''}`}>
        <div className="card-t">1 · Pick your Day 1</div>
        <p className="card-d" style={{ marginBottom: 14 }}>
          Everything aligns to this date. Once saved it can never be changed from the client.
        </p>
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={e => e.target.value && setStartDate(e.target.value)} className="date-in" style={{ width: 200 }} />
        </div>
        <div className="mathf" style={{ marginTop: 10 }}>
          <span className="lbl">The journey</span>
          Day 1 · {pretty(startDate)} → Day 400 · {pretty(endDate)}
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setStep(1)}>Continue →</button>
        </div>
      </div>

      {/* step 2 — commitment statement */}
      <div className={`card onb-step ${step === 1 ? 'on' : ''}`}>
        <div className="card-t">2 · Your statement of commitment</div>
        <p className="card-d" style={{ marginBottom: 10 }}>
          This gets SHA-512 hashed with your user id and embedded in your commitment image. Make it yours.
        </p>
        <div className="field">
          <textarea value={statement} onChange={e => setStatement(e.target.value)} rows={4}
            placeholder="I commit to showing up every single day for the next 400 days — no broken chains…" />
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setStep(0)}>‹ Back</button>
          <button className="btn btn-primary" disabled={!statement.trim()} onClick={() => setStep(2)}>Continue →</button>
        </div>
      </div>

      {/* step 3 — choose what to learn */}
      <div className={`card onb-step ${step === 2 ? 'on' : ''}`}>
        <div className="card-t">3 · Choose what to learn</div>
        <p className="card-d" style={{ marginBottom: 10 }}>
          You decide the plan. Leave a topic on to include it, or turn it off to skip it —
          you can change this anytime (removed topics stay logged so you can add them back later).
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-soft btn-sm" onClick={() => setUnits(new Set(UNITS.map((_, i) => i)))}>Select all</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setUnits(new Set())}>Clear all</button>
          <span className="chip chip-neutral" style={{ marginLeft: 'auto' }}>{selCount}/{UNITS.length} topics</span>
        </div>
        <div className="topic-list">
          {UNITS.map((u, i) => (
            <label key={i} className={`topic-tog ${units.has(i) ? 'on' : ''}`}>
              <input type="checkbox" checked={units.has(i)} onChange={() => toggleUnit(i)} />
              <span>{u.title}</span>
              <span className="t-days">{u.days[0]}–{u.days[u.days.length - 1]}</span>
            </label>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setStep(1)}>‹ Back</button>
          <button className="btn btn-primary" disabled={selCount === 0} onClick={() => setStep(3)}>Review →</button>
        </div>
      </div>

      {/* step 3b — confirm */}
      <div className={`card onb-step ${step === 3 ? 'on' : ''}`}>
        <div className="card-t">4 · Lock it in</div>
        <div style={{ display: 'grid', gap: 10, margin: '12px 0', fontSize: 14 }}>
          <div>📅 <b>Day 1</b> — {pretty(startDate)} <span style={{ color: 'var(--text-mute)' }}>(immutable)</span></div>
          <div>🏁 <b>Day 400</b> — {pretty(endDate)}</div>
          <div>📚 <b>{selCount} topics</b> selected</div>
          <div>✍ <b>Statement</b> — “{statement.slice(0, 120)}{statement.length > 120 ? '…' : ''}”</div>
        </div>
        <div className="locked-banner">🔒 This is permanent. The start date cannot be changed afterwards.</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setStep(2)}>‹ Back</button>
          <button className="btn btn-primary" disabled={busy} onClick={finish}>
            {busy ? 'Saving…' : '✓ Create my commitment'}
          </button>
        </div>
      </div>

      {/* step 4 — done */}
      <div className={`onb-step ${step === 4 ? 'on' : ''}`}>
        {comm && <CommitmentCard commitment={comm} username={user?.user_metadata?.username || user?.email} />}
        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/')}>Enter the tracker →</button>
          <button className="btn btn-ghost btn-lg" onClick={() => nav('/patterns')}>Explore Pattern Master</button>
        </div>
      </div>
    </div>
  );
}

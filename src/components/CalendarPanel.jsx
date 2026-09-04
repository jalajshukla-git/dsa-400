import { useState } from 'react';
import { TRACKER_DATA } from '../lib/tracker-data';
import { MN, ymd, parseYmd, ymdForDay, todayIso, dayDiff } from '../lib/utils';

const DAYS = TRACKER_DATA.days;
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarPanel({ s, onOpenDay }) {
  const now = new Date();
  const anchor = s.commitment ? parseYmd(s.commitment.start_date) : now;
  const [cal, setCal] = useState({ y: anchor.getFullYear(), m: anchor.getMonth() });
  const [today] = useState(() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() }; });

  const y = cal.y, m = cal.m;
  const first = new Date(y, m, 1, 12);
  const lead = first.getDay();
  const nDays = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let dd = lead; dd >= 1; dd--) cells.push(new Date(y, m, 1 - dd, 12));
  for (let d = 1; d <= nDays; d++) cells.push(new Date(y, m, d, 12));
  for (let d = 1; cells.length % 7; d++) cells.push(new Date(y, m + 1, d, 12));

  const tIso = todayIso();
  const start = s.commitment?.start_date;
  const planDayOf = dt => {
    if (!start) return null;
    const pd = dayDiff(ymd(dt), start) + 1;
    return pd >= 1 && pd <= 400 ? pd : null;
  };

  const nav = dir => { let mm = cal.m + dir, yy = cal.y; if (mm < 0) { mm = 11; yy--; } if (mm > 11) { mm = 0; yy++; } setCal({ y: yy, m: mm }); };

  return (
    <div className="card spot cal">
      <div className="cal-top">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => nav(-1)}>‹</button>
          <div className="cal-title">{MN[m]} {y}</div>
          <button className="icon-btn" onClick={() => nav(1)}>›</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCal({ y: today.y, m: today.m })}>Today</button>
        </div>
        <label className="cal-start">
          Day 1 starts on
          <input type="date" className="date-in" disabled value={start || ''} title="Anchored at onboarding — immutable" />
          <span className="lock-note">🔒 permanent</span>
        </label>
      </div>
      <div className="cal-week">{WD.map(w => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">
        {cells.map((dt, i) => {
          const iso = ymd(dt);
          const pd = planDayOf(dt);
          if (pd === null) return (
            <button key={i} className="cal-cell outside" tabIndex={-1}><span className="dnum">{dt.getDate()}</span></button>
          );
          const d = DAYS[pd - 1];
          const cls = ['cal-cell'];
          if (d.sun) cls.push('psun');
          if (s.sealed[pd]) cls.push('sealed');
          else if (dayDiff(iso, tIso) < 0 && !s.excluded[pd]) cls.push('missed');
          if (pd === s.pointer) cls.push('ptoday');
          if (iso === tIso) cls.push('realtoday');
          if (s.excluded[pd]) cls.push('off');
          return (
            <button key={i} className={cls.join(' ')} onClick={() => onOpenDay(pd)}
              title={`${iso} · Day ${pd} — ${d.concept}${s.excluded[pd] ? ' · optional' : ''}`}>
              <span className="dnum">{dt.getDate()}</span><span className="pday">D{pd}</span>
            </button>
          );
        })}
      </div>
      <div className="cal-foot">
        <span>{start ? 'anchored · ' + pretty2(start) : 'no anchor yet'}</span>
        <span style={{ marginLeft: 'auto' }}>
          <i className="lg lg-done" /> sealed · <i className="lg lg-today" /> up next · <i className="lg lg-todo" /> missed · <i className="lg lg-off" /> optional
        </span>
      </div>
    </div>
  );
}

const pretty2 = iso => { const d = parseYmd(iso); return `${MN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };

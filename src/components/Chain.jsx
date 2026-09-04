import { useState } from 'react';
import { TRACKER_DATA } from '../lib/tracker-data';

const DAYS = TRACKER_DATA.days;

/* Slim horizontal consistency chain — GitHub / LeetCode contribution style.
   400 cells in a 7-row × auto-column grid. Click = jump, hover = detail. */
export default function Chain({ s, onOpenDay }) {
  const [foot, setFoot] = useState(null);

  const cls = d => {
    const c = ['cell'];
    if (d.sun) c.push('sun');
    if (s.sealed[d.id]) c.push('done');
    else if (d.id === s.pointer) c.push('today');
    else if (s.isLocked(d.id)) c.push('past');
    if (s.excluded[d.id]) c.push('off');
    return c.join(' ');
  };

  const title = d => {
    const base = `Day ${d.id} · ${d.concept}`;
    if (s.sealed[d.id]) return base + ' · sealed ✓';
    if (s.excluded[d.id]) return base + ' · excluded (optional)';
    if (s.isLocked(d.id)) return base + ' · locked until its date arrives';
    return base + ' · open';
  };

  return (
    <div className="card chain-card">
      <div className="chain-head">
        <span className="chain-title">The chain — 400 days</span>
        <div className="chain-legend">
          <span><i className="lg lg-done" />sealed</span>
          <span><i className="lg lg-today" />today</span>
          <span><i className="lg lg-sun" />sunday</span>
          <span><i className="lg lg-off" />optional</span>
          <span><i className="lg lg-todo" />ahead</span>
        </div>
      </div>
      <div className="chain-grid" role="list" aria-label="All 400 days">
        {DAYS.map(d => (
          <button key={d.id} className={cls(d)} title={title(d)} role="listitem"
            onClick={() => onOpenDay(d.id)}
            onMouseEnter={() => setFoot(`Day ${d.id} · ${d.concept}${s.sealed[d.id] ? ' · sealed ✓' : s.excluded[d.id] ? ' · excluded' : ''}`)}
            onMouseLeave={() => setFoot(null)} />
        ))}
      </div>
      <div className="chain-foot">
        {foot ? <span dangerouslySetInnerHTML={{ __html: foot.replace(/·/g, '·') }} />
          : <span>Hover a cell · click to open · <b>{s.sealedCount}/400</b> sealed</span>}
      </div>
    </div>
  );
}

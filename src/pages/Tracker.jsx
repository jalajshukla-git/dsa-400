import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackerData } from '../hooks/useTrackerData';
import { TRACKER_DATA } from '../lib/tracker-data';
import Nav from '../components/Nav';
import Chain from '../components/Chain';
import SearchModal from '../components/SearchModal';
import TodayPanel from '../components/TodayPanel';
import CalendarPanel from '../components/CalendarPanel';
import PlanPanel from '../components/PlanPanel';
import ProgressPanel from '../components/ProgressPanel';

const DAYS = TRACKER_DATA.days;
const N = DAYS.length;

export default function Tracker() {
  const { user, configured } = useAuth();
  const s = useTrackerData();
  const nav = useNavigate();
  const loc = useLocation();
  const [dayId, setDayId] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const prevPtr = useRef(null);

  // deep-link from Pattern Master: /?day=N
  useEffect(() => {
    const p = new URLSearchParams(loc.search).get('day');
    if (p) { const n = +p; if (n >= 1 && n <= N) { setDayId(n); setTimeout(() => { try { document.getElementById('today')?.scrollIntoView({ behavior: 'smooth' }); } catch {} }, 150); } }
  }, [loc.search]);

  // follow the pointer forward when it advances (e.g. after sealing today)
  useEffect(() => {
    if (!s.ready) return;
    if (prevPtr.current != null && s.pointer !== prevPtr.current && dayId === prevPtr.current) {
      setDayId(Math.min(s.pointer, N));
    }
    if (prevPtr.current == null) setDayId(Math.min(s.pointer, N));
    prevPtr.current = s.pointer;
  }, [s.ready, s.pointer]); // eslint-disable-line

  if (!s.ready) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-mute)' }}>LOADING…</div>;
  }

  // signed-in but no commitment yet → finish onboarding first
  if (configured && user && !s.commitment) return <Navigate to="/onboarding" replace />;

  const day = DAYS[Math.min(Math.max(dayId, 1), N) - 1];

  const scrollTo = id => { try { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {} };
  const openDay = id => { setDayId(Math.min(Math.max(id, 1), N)); scrollTo('today'); };

  return (
    <>
      <Nav onSearch={() => setSearchOpen(true)} />
      <div id="bg" aria-hidden="true"><div className="orb orb-1" /><div className="orb orb-2" /><div id="bg-grid" /><div id="bg-vig" /></div>

      {/* ── HERO + SLIM CHAIN ── */}
      <header id="hero">
        <div className="wrap hero-in">
          <span className="kicker">DSA · 400 days · the consistency engine</span>
          <h1>Don’t break <span className="grad">the chain</span>.</h1>
          <p className="hero-sub">
            A <b>400-day</b> operating system for Data Structures &amp; Algorithms, now on Supabase —
            permanent start date, tamper-proof streak logs, pattern notes with a timeline, and the
            full <b>40-pattern playbook</b> alongside.
          </p>
          <div className="cta-row">
            <button className="btn btn-primary btn-lg" onClick={() => scrollTo('today')}>Start Day {s.pointer} →</button>
            <button className="btn btn-ghost btn-lg" onClick={() => scrollTo('plan')}>Browse your plan</button>
            <button className="btn btn-ghost btn-lg" onClick={() => nav('/patterns')}>Open Pattern Master</button>
          </div>
          <div className="stat-row">
            <div className="stat"><div className="v">{s.sealedCount}<span className="v-sub">/400</span></div><div className="l">Days sealed</div></div>
            <div className="stat"><div className="v">{s.solvedCount}</div><div className="l">Questions solved</div></div>
            <div className="stat"><div className="v">{s.streak}</div><div className="l">Current streak</div></div>
            <div className="stat"><div className="v">{s.best}</div><div className="l">Best streak</div></div>
          </div>
          <Chain s={s} onOpenDay={openDay} />
        </div>
      </header>

      <div className="wrap"><div className="rule" /></div>

      {/* ── TODAY ── */}
      <section className="sec" id="today">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-num">01 · Today</span>
            <h2>Today’s radar</h2>
            <p className="sub">One day, one set. Tick every question to seal the day — only sealed days count. Notes auto-save with a full edit timeline.</p>
          </div>
          <div className="today-grid">
            <TodayPanel s={s} day={day} setDay={setDayId} />
            <aside>
              <div className="card side-card">
                <div className="side-lbl">The daily pact</div>
                <div className="card-d">1h learn the concept · 2.5h solve the set · 1h revisit yesterday’s toughest · 0.5h write pattern notes.</div>
              </div>
              <div className="card side-card">
                <div className="side-lbl">Streak rules</div>
                <div className="card-d">A day counts only when <b>sealed</b>. Sunday review days count too. You can’t jump ahead — every day unlocks on its calendar date, derived from your permanent start date.</div>
              </div>
              <div className="card side-card">
                <div className="side-lbl">Persistence</div>
                <div className="card-d">{s.usingSupabase ? 'Synced to your Supabase ledger — immutable, server-stamped, survives device changes.' : 'Demo mode (localStorage) — connect Supabase via .env to make everything permanent.'}</div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="wrap"><div className="rule" /></div>

      {/* ── CALENDAR ── */}
      <section className="sec" id="calendar">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-num">02 · Calendar</span>
            <h2>Real days, real dates</h2>
            <p className="sub">The 400-day plan projected onto an actual calendar, anchored to your permanent start date. Sealed dates glow, missed dates fade, future dates stay locked.</p>
          </div>
          <CalendarPanel s={s} onOpenDay={openDay} />
        </div>
      </section>

      <div className="wrap"><div className="rule" /></div>

      {/* ── PLAN ── */}
      <section className="sec" id="plan">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-num">03 · The plan</span>
            <h2>Your 400 days, your way</h2>
            <p className="sub">Search it, filter it, work it. Turn any topic optional, remove any question (it stays logged), and add your own LeetCode numbers — yours are tagged separately.</p>
          </div>
          <PlanPanel s={s} onOpenDay={openDay} />
        </div>
      </section>

      <div className="wrap"><div className="rule" /></div>

      {/* ── PROGRESS ── */}
      <section className="sec" id="progress">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-num">04 · Progress</span>
            <h2>The proof</h2>
            <p className="sub">Analytics over your sealed days, your extra questions, and the log of everything you removed.</p>
          </div>
          <ProgressPanel s={s} />
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>DSA·400 — your consistency engine · emerald / dark</span>
          <span>Patterns over problems — <b style={{ color: 'var(--a-300)' }}>always</b></span>
        </div>
      </footer>

      {searchOpen && <SearchModal s={s} onClose={() => setSearchOpen(false)} onOpenDay={openDay} />}
    </>
  );
}

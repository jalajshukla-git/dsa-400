import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, configured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TRACKER_DATA, LC_TO_DAYS, LC_TO_PATTERN, LC_TITLES } from '../lib/tracker-data';
import { todayIso, dayDiff, ymdForDay, commitmentHash, clamp, genCommitId } from '../lib/utils';

const DAYS = TRACKER_DATA.days;
const UNITS = TRACKER_DATA.units;
const N_DAYS = DAYS.length;

/* pattern reference for each original tracker item (lc number via slug match) */
const ITEM_PATTERN = {};
for (const lc of Object.keys(LC_TO_DAYS)) {
  for (const hit of LC_TO_DAYS[lc]) {
    ITEM_PATTERN[`${hit.day}:${hit.idx}`] = LC_TO_PATTERN[lc] || null;
  }
}

const pKey = (d, i) => `${d}:${i}`;
const todayPlanDay = start => (start ? clamp(dayDiff(todayIso(), start) + 1, 1, N_DAYS) : 1);

/* streak over a (sealed + excluded + commitment) snapshot — excluded days never break the chain */
function computeStreak(st) {
  const start = st.commitment?.start_date || null;
  const tpd = todayPlanDay(start);
  let streak = 0;
  let d = st.sealed[tpd] ? tpd : tpd - 1;
  for (; d >= 1; d--) {
    if (st.excluded[d]) continue;
    if (st.sealed[d]) streak++; else break;
  }
  return streak;
}

const empty = () => ({
  commitment: null, excluded: {}, removed: {}, extras: [], sealed: {},
  done: {}, notes: {}, best: 0,
});

const DEMO_KEY = 'prj-dsa-demo-v1';
function loadDemo() {
  try { const r = localStorage.getItem(DEMO_KEY); return r ? { ...empty(), ...JSON.parse(r) } : empty(); }
  catch { return empty(); }
}
function saveDemo(s) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch {} }

export function useTrackerData() {
  const { user } = useAuth();
  const [s, setS] = useState(empty);
  const [ready, setReady] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [noteHist, setNoteHist] = useState({}); // dayId -> [{text, saved_at}]
  const userId = user?.id || 'demo';
  const usingSupabase = Boolean(configured && user);
  const busy = useRef(false);

  /* ── load ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      busy.current = true;
      if (!usingSupabase) {
        if (alive) { setS(loadDemo()); setLedger([]); setNoteHist({}); setReady(true); }
        busy.current = false; return;
      }
      const st = empty();
      const get = async t => { const { data, error } = await supabase.from(t).select('*'); return { data, error }; };
      const [c, ex, rm, exi, dp, ip, nt, ev] = await Promise.all([
        supabase.from('commitment').select('*').maybeSingle(),
        get('excluded_days'), get('removed_items'), get('extra_items'),
        get('day_progress'), get('item_progress'), get('notes'),
        supabase.from('events').select('*').order('id', { ascending: true }),
      ]);
      if (!alive) return;
      st.commitment = c.data || null;
      (ex.data || []).forEach(r => { st.excluded[r.day_id] = true; });
      (rm.data || []).filter(r => !r.restored).forEach(r => { (st.removed[r.day_id] = st.removed[r.day_id] || {})[r.item_idx] = true; });
      st.extras = (exi.data || []).map(r => ({ id: r.id, lc: r.lc_number, title: r.title, url: r.url, platform: r.platform, target_day: r.target_day, status: r.status, done_at: r.done_at }));
      (dp.data || []).forEach(r => { if (r.is_sealed) st.sealed[r.day_id] = true; });
      (ip.data || []).forEach(r => { st.done[pKey(r.day_id, r.item_idx)] = true; });
      (nt.data || []).forEach(r => { st.notes[r.day_id] = r.text; });
      let best = 0, run = 0;
      for (let d = 1; d <= N_DAYS; d++) { run = st.sealed[d] ? run + 1 : 0; best = Math.max(best, run); }
      st.best = best;
      setS(st); setLedger(ev.data || []); setNoteHist({});
      setReady(true); busy.current = false;
    })();
    return () => { alive = false; };
  }, [usingSupabase, userId]);

  /* ── event + persist helpers ── */
  const logEvent = useCallback(async (type, extra = {}) => {
    const evt = { type, ...extra };
    if (usingSupabase) { await supabase.from('events').insert({ ...evt, user_id: userId }); }
    setLedger(l => [...l, { ...evt, ts: new Date().toISOString(), user_id: userId }]);
    return evt;
  }, [usingSupabase, userId]);

  const persist = useCallback(ns => { setS(ns); if (!usingSupabase) saveDemo(ns); }, [usingSupabase]);

  /* ── mutations ── */
  const setCommitment = useCallback(async ({ statement, startDate }) => {
    const endDate = ymdForDay(startDate, N_DAYS);
    const hash = await commitmentHash(statement, userId);
    const commitId = genCommitId();
    const comm = { statement, hash, start_date: startDate, end_date: endDate, commit_id: commitId };
    const ns = { ...s, commitment: comm };
    if (usingSupabase) {
      const { error } = await supabase.from('commitment').insert({
        user_id: userId, statement, hash, commit_id: commitId, start_date: startDate, end_date: endDate,
      });
      if (error) throw error;
    }
    await logEvent('commit', { day: 1, text: hash });
    persist(ns);
    return comm;
  }, [s, usingSupabase, userId, logEvent, persist]);

  const toggleProb = useCallback(async (dayId, idx, on, meta = {}) => {
    const ns = { ...s, done: { ...s.done } };
    const key = pKey(dayId, idx);
    if (on) ns.done[key] = true; else delete ns.done[key];
    if (usingSupabase) {
      if (on) await supabase.from('item_progress').upsert({ user_id: userId, day_id: dayId, item_idx: idx, done: true, kind: meta.kind || 'original', extra_id: meta.extraId || null, lc_number: meta.lc || null, title: meta.title || null });
      else await supabase.from('item_progress').delete().eq('user_id', userId).eq('day_id', dayId).eq('item_idx', idx);
    }
    await logEvent(on ? 'tick' : 'untick', { day: dayId, idx, text: meta.title });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const sealDay = useCallback(async (dayId, on) => {
    const ns = { ...s, sealed: { ...s.sealed } };
    if (on) ns.sealed[dayId] = true; else delete ns.sealed[dayId];
    if (usingSupabase) {
      const { error } = await supabase.from('day_progress').upsert({ user_id: userId, day_id: dayId, is_sealed: on, sealed_at: on ? new Date().toISOString() : null });
      if (error) throw error; // future-day sealing is rejected server-side by trigger
      await supabase.from('streak_log').insert({ user_id: userId, on_date: todayIso(), streak: computeStreak(ns), broken: !on });
    }
    await logEvent(on ? 'seal' : 'unseal', { day: dayId });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const setNote = useCallback(async (dayId, text) => {
    const ns = { ...s, notes: { ...s.notes } };
    ns.notes[dayId] = text;
    if (usingSupabase) {
      await supabase.from('notes').upsert({ user_id: userId, day_id: dayId, text, updated_at: new Date().toISOString() });
      await supabase.from('note_history').insert({ user_id: userId, day_id: dayId, text });
      setNoteHist(h => ({ ...h, [dayId]: [{ text, saved_at: new Date().toISOString() }, ...(h[dayId] || [])].slice(0, 60) }));
    }
    await logEvent('note', { day: dayId, text });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const loadNoteHistory = useCallback(async dayId => {
    if (!usingSupabase) return [];
    const { data } = await supabase.from('note_history').select('*').eq('user_id', userId).eq('day_id', dayId).order('id', { ascending: false }).limit(60);
    setNoteHist(h => ({ ...h, [dayId]: data || [] }));
    return data || [];
  }, [usingSupabase, userId]);

  const addExtra = useCallback(async ({ lc, title, url, platform, targetDay }) => {
    const item = { id: Date.now(), lc: lc || null, title, url: url || null, platform: platform || null, target_day: targetDay || null, status: targetDay ? 'scheduled' : 'later', done_at: null };
    const ns = { ...s, extras: [...s.extras, item] };
    if (usingSupabase) {
      const { data, error } = await supabase.from('extra_items').insert({ user_id: userId, lc_number: lc, title, url, platform, target_day: targetDay, status: item.status }).select().single();
      if (error) throw error;
      item.id = data.id;
      ns.extras = ns.extras.map(e => (e === item ? item : e));
    }
    await logEvent('add_extra', { day: targetDay || null, text: title });
    persist(ns);
    return item;
  }, [s, usingSupabase, userId, logEvent, persist]);

  const scheduleExtra = useCallback(async (id, targetDay) => {
    const day = targetDay || null;
    const ns = { ...s, extras: s.extras.map(e => e.id === id ? { ...e, target_day: day, status: day ? 'scheduled' : 'later' } : e) };
    if (usingSupabase) await supabase.from('extra_items').update({ target_day: day, status: day ? 'scheduled' : 'later' }).eq('id', id);
    const ex = ns.extras.find(e => e.id === id);
    await logEvent('add_extra', { day, text: ex?.title });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const setExtraDone = useCallback(async (id, on) => {
    const ns = { ...s, extras: s.extras.map(e => e.id === id ? { ...e, status: on ? 'done' : (e.target_day ? 'scheduled' : 'later'), done_at: on ? new Date().toISOString() : null } : e) };
    if (usingSupabase) await supabase.from('extra_items').update({ status: on ? 'done' : (ns.extras.find(e => e.id === id)?.status), done_at: on ? new Date().toISOString() : null }).eq('id', id);
    const ex = ns.extras.find(e => e.id === id);
    await logEvent(on ? 'tick' : 'untick', { day: ex?.target_day, text: ex?.title });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const removeExtra = useCallback(async id => {
    const ns = { ...s, extras: s.extras.filter(e => e.id !== id) };
    if (usingSupabase) await supabase.from('extra_items').delete().eq('id', id);
    persist(ns);
  }, [s, usingSupabase, persist]);

  const setDayIncluded = useCallback(async (dayId, included) => {
    const ns = { ...s, excluded: { ...s.excluded } };
    if (included) delete ns.excluded[dayId]; else ns.excluded[dayId] = true;
    if (usingSupabase) {
      if (included) await supabase.from('excluded_days').delete().eq('user_id', userId).eq('day_id', dayId);
      else await supabase.from('excluded_days').upsert({ user_id: userId, day_id: dayId });
    }
    await logEvent(included ? 'restore' : 'exclude', { day: dayId });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const setUnitIncluded = useCallback(async (unitIndex, included) => {
    const unit = UNITS[unitIndex];
    if (!unit) return;
    const ns = { ...s, excluded: { ...s.excluded } };
    unit.days.forEach(d => { if (included) delete ns.excluded[d]; else ns.excluded[d] = true; });
    if (usingSupabase) {
      const rows = unit.days.map(d => ({ user_id: userId, day_id: d }));
      if (included) {
        await supabase.from('excluded_days').delete().eq('user_id', userId).in('day_id', unit.days);
      } else {
        await supabase.from('excluded_days').upsert(rows);
      }
    }
    await logEvent(included ? 'restore' : 'exclude', { day: unit.days[0], text: unit.title });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const removeItem = useCallback(async (dayId, idx, meta) => {
    const ns = { ...s, removed: { ...s.removed } };
    (ns.removed[dayId] = { ...(ns.removed[dayId] || {}) })[idx] = true;
    if (usingSupabase) {
      await supabase.from('removed_items').upsert({ user_id: userId, day_id: dayId, item_idx: idx, title: meta?.title, lc_number: meta?.lc || null, url: meta?.u || null, removed_at: new Date().toISOString(), restored: false });
    }
    await logEvent('remove_item', { day: dayId, idx, text: meta?.title });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  const restoreItem = useCallback(async (dayId, idx) => {
    const ns = { ...s, removed: { ...s.removed } };
    if (ns.removed[dayId]) { ns.removed[dayId] = { ...ns.removed[dayId] }; delete ns.removed[dayId][idx]; }
    if (usingSupabase) await supabase.from('removed_items').update({ restored: true }).eq('user_id', userId).eq('day_id', dayId).eq('item_idx', idx);
    await logEvent('restore', { day: dayId, idx });
    persist(ns);
  }, [s, usingSupabase, userId, logEvent, persist]);

  /* ── derived ── */
  const derived = useMemo(() => {
    const start = s.commitment?.start_date || null;
    const tpd = todayPlanDay(start);
    const included = d => !s.excluded[d.id];
    const sealedList = DAYS.filter(d => included(d) && s.sealed[d.id]);
    // pointer = first included, unsealed day
    let pointer = 1;
    for (const d of DAYS) { if (included(d) && !s.sealed[d.id]) { pointer = d.id; break; } }
    // streak: consecutive sealed calendar days ending today/yesterday
    const streak = computeStreak(s);
    let best = 0, run = 0;
    for (const day of DAYS) {
      if (s.excluded[day.id]) { continue; }
      if (s.sealed[day.id]) { run++; best = Math.max(best, run); } else run = 0;
    }
    best = Math.max(best, s.best || 0);
    const sealedCount = sealedList.length;
    const solvedCount = Object.keys(s.done).length + s.extras.filter(e => e.status === 'done').length;
    return { start, tpd, pointer, streak, best, sealedCount, solvedCount };
  }, [s]);

  const dayDone = useCallback((d, extrasForDay) => {
    if (s.sealed[d.id]) return true;
    const items = effectiveItems(d, s, extrasForDay);
    return items.length > 0 && items.every(it => it.done);
  }, [s]);

  const isLocked = useCallback(dayId => {
    const start = s.commitment?.start_date;
    if (!start) return false;
    return dayDiff(ymdForDay(start, dayId), todayIso()) > 0;
  }, [s.commitment]);

  return {
    ready, usingSupabase, userId,
    commitment: s.commitment, excluded: s.excluded, removed: s.removed,
    extras: s.extras, sealed: s.sealed, done: s.done, notes: s.notes,
    ledger, noteHist,
    ...derived,
    dayDone, isLocked,
    setCommitment, toggleProb, sealDay, setNote, loadNoteHistory,
    addExtra, scheduleExtra, setExtraDone, removeExtra,
    setDayIncluded, setUnitIncluded, removeItem, restoreItem,
    ITEM_PATTERN, LC_TO_DAYS, LC_TO_PATTERN, LC_TITLES,
  };
}

/* effective (visible, enriched) items for a day: original minus removed + extras */
export function effectiveItems(d, s, extrasForDay) {
  const out = [];
  d.items.forEach((it, i) => {
    if (s.removed[d.id] && s.removed[d.id][i]) return;
    const key = pKey(d.id, i);
    out.push({ ...it, idx: i, kind: 'original', done: !!s.done[key], pattern: ITEM_PATTERN[key] || null });
  });
  (extrasForDay || []).forEach(e => {
    out.push({ n: e.title, j: 'USER', u: e.url, p: false, idx: `x${e.id}`, kind: 'extra', extraId: e.id, done: e.status === 'done', pattern: null });
  });
  return out;
}

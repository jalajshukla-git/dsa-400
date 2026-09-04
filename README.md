# prj-DSA — DSA·400 Tracker + Pattern Master

One React + Supabase app that merges **two** projects into a single usable website:

| Route | What |
|---|---|
| `/login`, `/register` | Auth (Supabase email/password) |
| `/onboarding` | Pick a **permanent** start date, write a commitment statement, choose what to learn |
| `/` | **DSA·400 tracker** — slim GitHub/LeetCode-style chain, calendar, plan, progress |
| `/patterns` | **Pattern Master** — the full 40-pattern playbook (cyan theme, faithful port) |
| `/hash/:hash` | Public commitment-verification page (login-gated) |
| `/file` | Raw append-only ledger (JSON / JSONL export) |

## Quick start

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

Then run `supabase/schema.sql` once in your Supabase SQL Editor.

## Supabase setup

1. Create a Supabase project (the `prj-DSA` one).
2. SQL Editor → paste & run `supabase/schema.sql` (tables, RLS, the
   future-day sealing trigger, and the auto-profile trigger).
3. Project Settings → API → copy the Project URL and anon key into `.env`.
4. (Recommended) enable **Email confirmations off** for quick testing under
   Authentication → Providers → Email.

## What's enforced server-side

- `commitment` has **no UPDATE policy** → start date & SHA-512 hash are permanent.
- `day_progress` has a **trigger** that rejects sealing any day whose calendar
  date (from `commitment.start_date`) is in the future.
- `events` and `streak_log` are **append-only** (insert/select only).
- Every table is RLS-locked to the signed-in user.

## Feature map (user requirements)

- Hero chain → slim horizontal grid (GitHub contribution style). ✅
- Search by question name **or LeetCode number** → shows if it's in your plan. ✅
- Not found → add it to a day / save for later; user additions are tagged & filterable. ✅
- One theme (**emerald**) + dark only, theme switch removed. ✅ (Patterns page keeps cyan.)
- Register/login matching the theme. ✅
- Onboarding popup: start date (permanent), commitment statement, topic selection. ✅
- 7:4 commitment image download (dates + end date) + SHA-512(statement + user id) + QR. ✅
- QR → `/hash/{hash}` → login-gated verification of statement/hash/dates. ✅
- Server logs: sealed days, chain breaks, streak snapshots — user can't edit. ✅
- Date gating: can't jump to future days/topics/questions. ✅
- Pattern notes per day, editable, with a full edit **timeline**. ✅
- Raw ledger `/file` for API-style export. ✅
- Footer "data parsed from dsa400.md / 10 themes" details removed. ✅
- Fixed 3-phase classification removed → user chooses what to learn; topics/questions removable with a restore log. ✅
- Pattern Master content preserved; all its questions cross-referenced into DSA-400 (`📌 Day N` links both ways). ✅

## Notes

- Without `.env`, the app runs in **demo mode** (localStorage) so you can explore
  the UI. Connect Supabase to make everything permanent.
- The 40 patterns and the 400-day plan were extracted programmatically from the
  original files (`tools/extract.mjs`) into `src/lib/*-data.js` — no content loss.

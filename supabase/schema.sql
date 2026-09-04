-- ═══════════════════════════════════════════════════════════════════════
-- prj-DSA · Supabase schema  (run in the SQL Editor of your prj-DSA project)
-- Replaces the old server.js: append-only ledger + permanent commitment +
-- per-user plan/progress/notes. RLS keeps every user to their own rows.
-- ═══════════════════════════════════════════════════════════════════════

-- ── profiles ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text,
  created_at  timestamptz not null default now()
);

-- ── commitment · created once, immutable ────────────────────────────────
create table if not exists public.commitment (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  statement   text not null,
  hash        text not null unique,          -- sha512(statement + '::' + user_id)
  start_date  date not null,                 -- permanent Day-1 anchor
  end_date    date not null,                 -- start_date + 399
  created_at  timestamptz not null default now()
);

-- ── user's learning plan: what they chose to keep / drop ────────────────
create table if not exists public.excluded_days (
  user_id      uuid not null references auth.users(id) on delete cascade,
  day_id       int  not null check (day_id between 1 and 400),
  excluded_at  timestamptz not null default now(),
  primary key (user_id, day_id)
);

-- log of removed questions (so they can be re-added later)
create table if not exists public.removed_items (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  day_id      int  not null,
  item_idx    int  not null,
  title       text,
  lc_number   text,
  url         text,
  removed_at  timestamptz not null default now(),
  restored    boolean not null default false,
  unique (user_id, day_id, item_idx)
);

-- user-added questions (saved for later / scheduled onto a day)
create table if not exists public.extra_items (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  lc_number   text,
  title       text not null,
  url         text,
  target_day  int,                            -- null => "save for later" queue
  status      text not null default 'later' check (status in ('later','scheduled','done')),
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ── progress ────────────────────────────────────────────────────────────
create table if not exists public.day_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day_id     int  not null check (day_id between 1 and 400),
  is_sealed  boolean not null default false,
  sealed_at  timestamptz,
  primary key (user_id, day_id)
);

create table if not exists public.item_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day_id     int  not null,
  item_idx   int  not null,
  done       boolean not null default true,
  done_at    timestamptz not null default now(),
  kind       text not null default 'original' check (kind in ('original','extra')),
  extra_id   bigint,
  lc_number  text,
  title      text,
  primary key (user_id, day_id, item_idx)
);

-- ── pattern notes + edit timeline ───────────────────────────────────────
create table if not exists public.notes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day_id     int  not null check (day_id between 1 and 400),
  text       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, day_id)
);

create table if not exists public.note_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  day_id     int  not null,
  text       text not null,
  saved_at   timestamptz not null default now()
);

-- ── append-only event ledger (the new "/file" raw ledger) ───────────────
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  ts         timestamptz not null default now(),
  type       text not null check (type in ('tick','untick','seal','unseal','note','commit','exclude','restore','add_extra','remove_item')),
  day        int,
  idx        int,
  text       text
);

-- ── streak snapshots (server-recorded, user cannot edit) ────────────────
create table if not exists public.streak_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  on_date    date not null,
  streak     int  not null,
  broken     boolean not null default false
);

-- ═══════════════════════════════════════════════════════════════════════
-- ENFORCEMENT: a day can never be sealed before its calendar date arrives.
-- The calendar derives from the permanent commitment.start_date.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.plan_date(p_user uuid, p_day int)
returns date language sql stable as $$
  select c.start_date + (p_day - 1)
  from public.commitment c where c.user_id = p_user;
$$;

create or replace function public.enforce_no_future_seal()
returns trigger language plpgsql as $$
declare d date;
begin
  if new.is_sealed then
    select public.plan_date(new.user_id, new.day_id) into d;
    if d is null then raise exception 'no commitment set'; end if;
    if d > current_date then
      raise exception 'cannot seal a future day (day % maps to %)', new.day_id, d;
    end if;
    new.sealed_at := coalesce(new.sealed_at, now());
  else
    new.sealed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_no_future_seal on public.day_progress;
create trigger trg_no_future_seal
  before insert or update on public.day_progress
  for each row execute function public.enforce_no_future_seal();

-- ═══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════
alter table public.profiles        enable row level security;
alter table public.commitment      enable row level security;
alter table public.excluded_days    enable row level security;
alter table public.removed_items    enable row level security;
alter table public.extra_items      enable row level security;
alter table public.day_progress     enable row level security;
alter table public.item_progress    enable row level security;
alter table public.notes            enable row level security;
alter table public.note_history     enable row level security;
alter table public.events           enable row level security;
alter table public.streak_log       enable row level security;

create policy "own profiles"    on public.profiles     for all using (auth.uid() = id);
create policy "own commitment"  on public.commitment   for select using (auth.uid() = user_id);
create policy "insert commitment" on public.commitment for insert with check (auth.uid() = user_id);
-- note: no UPDATE policy on commitment → start_date & hash are permanent

create policy "own excluded"    on public.excluded_days for all using (auth.uid() = user_id);
create policy "own removed"     on public.removed_items for all using (auth.uid() = user_id);
create policy "own extras"      on public.extra_items   for all using (auth.uid() = user_id);
create policy "own day_prog"    on public.day_progress  for all using (auth.uid() = user_id);
create policy "own item_prog"   on public.item_progress for all using (auth.uid() = user_id);
create policy "own notes"       on public.notes         for all using (auth.uid() = user_id);
create policy "own note_hist"   on public.note_history  for select using (auth.uid() = user_id);
create policy "insert note_hist" on public.note_history for insert with check (auth.uid() = user_id);
create policy "own events sel"  on public.events        for select using (auth.uid() = user_id);
create policy "own events ins"  on public.events        for insert with check (auth.uid() = user_id);
-- events & streak_log are append-only: no UPDATE/DELETE policies
create policy "own streak sel"  on public.streak_log    for select using (auth.uid() = user_id);
create policy "own streak ins"  on public.streak_log    for insert with check (auth.uid() = user_id);

-- ── auto-create a profile row on signup ─────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

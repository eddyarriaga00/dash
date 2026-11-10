-- Dash cloud sync. Each "vault" is one person's dashboard, addressed by a long
-- random sync code that only their devices know. The table itself is locked
-- (RLS on, no policies, no grants); the browser can only call the two
-- functions below, and only with the exact code.

create table if not exists public.dash_vaults (
  id         text primary key check (char_length(id) >= 40),
  data       jsonb not null,
  rev        bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.dash_vaults enable row level security;
revoke all on public.dash_vaults from anon, authenticated;

create or replace function public.dash_pull(vault text)
returns table (data jsonb, rev bigint, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select v.data, v.rev, v.updated_at
  from public.dash_vaults v
  where v.id = vault and char_length(vault) >= 40;
$$;

-- Optimistic concurrency: the write only lands if base_rev matches the
-- current revision; otherwise ok=false and the client merges and retries.
create or replace function public.dash_push(vault text, payload jsonb, base_rev bigint)
returns table (ok boolean, rev bigint, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare cur bigint;
begin
  if char_length(vault) < 40 then raise exception 'invalid vault'; end if;
  if pg_column_size(payload) > 2000000 then raise exception 'payload too large'; end if;
  select v.rev into cur from public.dash_vaults v where v.id = vault for update;
  if cur is null then
    insert into public.dash_vaults (id, data) values (vault, payload);
    return query select true, 1::bigint, now();
  elsif cur = base_rev then
    update public.dash_vaults v set data = payload, rev = cur + 1, updated_at = now() where v.id = vault;
    return query select true, cur + 1, now();
  else
    return query select false, v.rev, v.updated_at from public.dash_vaults v where v.id = vault;
  end if;
end $$;

revoke execute on function public.dash_pull(text) from public;
revoke execute on function public.dash_push(text, jsonb, bigint) from public;
grant execute on function public.dash_pull(text) to anon, authenticated;
grant execute on function public.dash_push(text, jsonb, bigint) to anon, authenticated;

-- Work shifts pushed from an iPhone Shortcut (the phone's Calendar is the only
-- thing that can read the work feed). Plain text, one shift per line:
--   Title|2026-11-10T15:30:00-05:00|2026-11-10T20:30:00-05:00
alter table public.dash_vaults add column if not exists shifts text;
alter table public.dash_vaults add column if not exists shifts_at timestamptz;

create or replace function public.dash_set_shifts(vault text, lines text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if char_length(vault) < 40 or char_length(coalesce(lines, '')) > 20000 then return false; end if;
  update public.dash_vaults v set shifts = coalesce(lines, ''), shifts_at = now() where v.id = vault;
  return found;
end $$;

create or replace function public.dash_shifts(vault text)
returns table (lines text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select v.shifts, v.shifts_at from public.dash_vaults v where v.id = vault and char_length(vault) >= 40;
$$;

revoke execute on function public.dash_set_shifts(text, text) from public;
revoke execute on function public.dash_shifts(text) from public;
grant execute on function public.dash_set_shifts(text, text) to anon, authenticated;
grant execute on function public.dash_shifts(text) to anon, authenticated;

-- Accounts: maps a verified sign-in ("google:<id>" / "github:<id>") to a vault.
-- Only the dash-auth edge function (service role) can touch these tables.
create table if not exists public.dash_accounts (
  identity   text primary key,
  vault      text not null,
  name       text,
  created_at timestamptz not null default now()
);
create table if not exists public.dash_tickets (
  ticket   text primary key,
  identity text not null,
  name     text,
  expires  timestamptz not null
);
alter table public.dash_accounts enable row level security;
alter table public.dash_tickets enable row level security;
revoke all on public.dash_accounts, public.dash_tickets from anon, authenticated;
grant select, insert, update, delete on public.dash_accounts, public.dash_tickets to service_role;

-- Push notifications. Only the dash-push edge function (service role) touches these.
create table if not exists public.dash_kv (k text primary key, v jsonb not null);
create table if not exists public.dash_push_subs (
  endpoint text primary key, vault text not null, created_at timestamptz not null default now(), fails int not null default 0
);
create table if not exists public.dash_reminders (
  id bigint generated always as identity primary key, vault text not null, at timestamptz not null,
  title text not null, body text not null default '', tag text not null default '', sent boolean not null default false
);
create index if not exists dash_reminders_due on public.dash_reminders (sent, at);
create table if not exists public.dash_outbox (
  id bigint generated always as identity primary key, endpoint text not null,
  title text, body text, tag text, created_at timestamptz not null default now()
);
alter table public.dash_kv enable row level security;
alter table public.dash_push_subs enable row level security;
alter table public.dash_reminders enable row level security;
alter table public.dash_outbox enable row level security;
revoke all on public.dash_kv, public.dash_push_subs, public.dash_reminders, public.dash_outbox from anon, authenticated;
grant select, insert, update, delete on public.dash_kv, public.dash_push_subs, public.dash_reminders, public.dash_outbox to service_role;

-- Every minute, ask the function to send whatever is due (uses the public publishable key).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('dash-push-tick') where exists (select 1 from cron.job where jobname = 'dash-push-tick');
select cron.schedule('dash-push-tick', '* * * * *', $cron$
  select net.http_post(
    url := 'https://cwlpoykayfrpohfvzrfm.supabase.co/functions/v1/dash-push',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_HNY1baadiiTnSl7CLRFxyg_i_RmTiYB","Authorization":"Bearer sb_publishable_HNY1baadiiTnSl7CLRFxyg_i_RmTiYB"}'::jsonb,
    body := '{"action":"tick"}'::jsonb
  );
$cron$);

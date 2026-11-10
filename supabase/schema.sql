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

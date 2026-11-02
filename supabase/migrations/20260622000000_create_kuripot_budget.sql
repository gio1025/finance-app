create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense')),
  title text not null default '',
  amount numeric(14, 2) not null check (amount > 0),
  created_at bigint not null,
  date date not null,
  time text,
  tag_id text,
  primary key (user_id, id)
);

create table if not exists public.budget_tags (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null,
  kind text not null check (kind in ('income', 'expense')),
  primary key (user_id, id)
);

create index if not exists budget_entries_user_date_idx
  on public.budget_entries (user_id, date desc, time desc, created_at desc);

alter table public.user_settings enable row level security;
alter table public.budget_entries enable row level security;
alter table public.budget_tags enable row level security;

drop policy if exists "Users manage their own settings" on public.user_settings;
create policy "Users manage their own settings"
  on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own budget entries" on public.budget_entries;
create policy "Users manage their own budget entries"
  on public.budget_entries for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own budget tags" on public.budget_tags;
create policy "Users manage their own budget tags"
  on public.budget_tags for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.user_settings, public.budget_entries, public.budget_tags
  to authenticated;

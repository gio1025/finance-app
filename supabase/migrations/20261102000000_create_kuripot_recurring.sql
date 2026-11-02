alter table public.budget_entries
  add column if not exists recurring_id text;

create table if not exists public.budget_recurring (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  source_entry_id text not null,
  type text not null check (type in ('income', 'expense')),
  title text not null default '',
  amount numeric(14, 2) not null check (amount > 0),
  tag_id text,
  time text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date not null,
  next_date date not null,
  end_date date,
  primary key (user_id, id),
  foreign key (user_id, source_entry_id)
    references public.budget_entries (user_id, id)
    on delete cascade,
  check (end_date is null or end_date >= start_date)
);

create index if not exists budget_recurring_user_next_date_idx
  on public.budget_recurring (user_id, next_date);

alter table public.budget_recurring enable row level security;

drop policy if exists "Users manage their own recurring transactions"
  on public.budget_recurring;
create policy "Users manage their own recurring transactions"
  on public.budget_recurring for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.budget_recurring
  to authenticated;

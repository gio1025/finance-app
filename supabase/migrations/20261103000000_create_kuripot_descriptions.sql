create table if not exists public.budget_descriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (length(trim(name)) > 0),
  primary key (user_id, id)
);

alter table public.budget_descriptions enable row level security;

drop policy if exists "Users manage their own budget descriptions"
  on public.budget_descriptions;
create policy "Users manage their own budget descriptions"
  on public.budget_descriptions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.budget_descriptions
  to authenticated;

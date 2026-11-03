alter table public.budget_descriptions
  add column if not exists description_type text not null default 'both';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'budget_descriptions_description_type_check'
      and conrelid = 'public.budget_descriptions'::regclass
  ) then
    alter table public.budget_descriptions
      add constraint budget_descriptions_description_type_check
      check (description_type in ('income', 'expense', 'both'));
  end if;
end;
$$;

-- Daily Task and To-Do Management System
-- Supabase Auth owns user identities. Each task belongs to exactly one auth user.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_due_date_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_completed_idx on public.tasks (user_id, completed);

create or replace function public.set_task_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_task_updated_at();

-- RLS is enabled for direct Supabase access. This app accesses the table only through
-- its protected Express API; that API uses a server-only service role key and checks
-- the verified owner's user_id on every query. The policy also provides safe owner
-- scoping should the table later be accessed with a user's Supabase token directly.
alter table public.tasks enable row level security;
drop policy if exists "Users manage their own tasks" on public.tasks;
create policy "Users manage their own tasks"
on public.tasks
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

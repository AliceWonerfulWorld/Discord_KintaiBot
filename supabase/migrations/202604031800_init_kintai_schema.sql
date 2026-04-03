-- Initial schema for Discord Kintai Bot
-- Reproducible baseline for local and production environments.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  discord_id text unique,
  name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_date date not null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  status text not null check (status in ('working', 'on_break', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendances_user_date_idx
  on public.attendances (user_id, target_date desc);

create table if not exists public.breaks (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendances(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  break_start_at timestamptz not null,
  break_end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists breaks_user_idx
  on public.breaks (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists trg_attendances_updated_at on public.attendances;
create trigger trg_attendances_updated_at
before update on public.attendances
for each row
execute function public.set_updated_at();

drop trigger if exists trg_breaks_updated_at on public.breaks;
create trigger trg_breaks_updated_at
before update on public.breaks
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

alter table public.users enable row level security;
alter table public.attendances enable row level security;
alter table public.breaks enable row level security;

drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin
on public.users
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists users_insert_self_or_admin on public.users;
create policy users_insert_self_or_admin
on public.users
for insert
with check (id = auth.uid() or public.is_admin());

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin
on public.users
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists attendances_select_self_or_admin on public.attendances;
create policy attendances_select_self_or_admin
on public.attendances
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists attendances_insert_self_or_admin on public.attendances;
create policy attendances_insert_self_or_admin
on public.attendances
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists attendances_update_self_or_admin on public.attendances;
create policy attendances_update_self_or_admin
on public.attendances
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists breaks_select_self_or_admin on public.breaks;
create policy breaks_select_self_or_admin
on public.breaks
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists breaks_insert_self_or_admin on public.breaks;
create policy breaks_insert_self_or_admin
on public.breaks
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists breaks_update_self_or_admin on public.breaks;
create policy breaks_update_self_or_admin
on public.breaks
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

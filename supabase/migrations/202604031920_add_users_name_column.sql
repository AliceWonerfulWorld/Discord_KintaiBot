-- Ensure the bot and web sync code can rely on users.name.

alter table public.users
  add column if not exists name text;

update public.users
set name = coalesce(name, discord_id, id::text)
where name is null;

alter table public.users
  alter column name set not null;
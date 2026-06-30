create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text not null check (char_length(username) between 2 and 16),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id) on delete set null,
  username text not null,
  text text not null check (char_length(text) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 40),
  body text not null check (char_length(body) between 4 and 300),
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_username text not null,
  target_username text not null,
  reason text not null check (char_length(reason) between 4 and 220),
  status text not null default 'open' check (status in ('open', 'closed')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_emails (
  email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_emails
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(left(new.raw_user_meta_data ->> 'username', 16), ''), left(split_part(new.email, '@', 1), 16), '玩家')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.chat_messages enable row level security;
alter table public.announcements enable row level security;
alter table public.reports enable row level security;
alter table public.admin_emails enable row level security;

drop policy if exists "profiles readable by signed in users" on public.profiles;
create policy "profiles readable by signed in users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "chat readable by signed in users" on public.chat_messages;
create policy "chat readable by signed in users"
on public.chat_messages for select
to authenticated
using (true);

drop policy if exists "signed in users can chat" on public.chat_messages;
create policy "signed in users can chat"
on public.chat_messages for insert
to authenticated
with check (auth.uid() = account_id);

drop policy if exists "announcements readable by everyone" on public.announcements;
create policy "announcements readable by everyone"
on public.announcements for select
to anon, authenticated
using (true);

drop policy if exists "admins can create announcements" on public.announcements;
create policy "admins can create announcements"
on public.announcements for insert
to authenticated
with check (public.is_admin());

drop policy if exists "reports readable by admins" on public.reports;
create policy "reports readable by admins"
on public.reports for select
to authenticated
using (public.is_admin());

drop policy if exists "users can create reports" on public.reports;
create policy "users can create reports"
on public.reports for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "admins can update reports" on public.reports;
create policy "admins can update reports"
on public.reports for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can read admin emails" on public.admin_emails;
create policy "admins can read admin emails"
on public.admin_emails for select
to authenticated
using (public.is_admin());

-- 执行完上面的建表脚本后，把下面这一行的邮箱改成你的管理员邮箱，再单独运行一次。
-- insert into public.admin_emails (email) values ('你的邮箱@example.com') on conflict do nothing;

-- MyLife: схема базы данных.
-- Запуск: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Файл можно запускать повторно: он не удаляет данные.

create extension if not exists pgcrypto;

-- ───────────── Профили ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  sex text not null default 'm' check (sex in ('m', 'f')),
  birth_year int,
  height_cm numeric,
  activity numeric not null default 1.4,
  goal_bf numeric,
  goal_weight numeric,
  goal_steps int not null default 10000,
  goal_water_ml int not null default 2500,
  goal_kcal int,
  goal_protein int,
  goal_fat int,
  goal_carbs int,
  share_finance boolean not null default false,
  share_meds boolean not null default false,
  share_photos boolean not null default false,
  partner_id uuid references public.profiles (id) on delete set null,
  invite_code text unique not null default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz not null default now()
);

-- Кто я по отношению к владельцу записи
create or replace function public.can_view(owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or owner = (select partner_id from profiles where id = auth.uid())
$$;

-- Скрытые разделы: партнёр видит, только если владелец включил показ
create or replace function public.can_view_private(owner uuid, what text)
returns boolean language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or exists (
        select 1 from profiles p
        where p.id = owner
          and p.partner_id = auth.uid()
          and case what
                when 'finance' then p.share_finance
                when 'meds' then p.share_meds
                when 'photos' then p.share_photos
                else false
              end
      )
$$;

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select using (public.can_view(id));
create policy profiles_insert on public.profiles for insert with check (id = auth.uid() and partner_id is null);
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- partner_id и invite_code меняются только через функции ниже
revoke update on public.profiles from authenticated, anon;
grant update (name, sex, birth_year, height_cm, activity, goal_bf, goal_weight, goal_steps, goal_water_ml,
              goal_kcal, goal_protein, goal_fat, goal_carbs, share_finance, share_meds, share_photos)
  on public.profiles to authenticated;

-- Связать пару по коду приглашения
create or replace function public.link_partner(code text)
returns text language plpgsql security definer set search_path = public as $$
declare other profiles;
begin
  if (select partner_id from profiles where id = auth.uid()) is not null then
    raise exception 'У тебя уже есть пара';
  end if;
  select * into other from profiles where invite_code = upper(trim(code)) and id <> auth.uid();
  if other.id is null then raise exception 'Код не найден'; end if;
  if other.partner_id is not null then raise exception 'У этого человека уже есть пара'; end if;
  update profiles set partner_id = other.id where id = auth.uid();
  update profiles set partner_id = auth.uid() where id = other.id;
  return other.name;
end $$;

create or replace function public.unlink_partner()
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select partner_id into pid from profiles where id = auth.uid();
  update profiles set partner_id = null where id = auth.uid();
  if pid is not null then update profiles set partner_id = null where id = pid; end if;
end $$;

grant execute on function public.link_partner(text), public.unlink_partner() to authenticated;

-- ───────────── Данные ─────────────
create table if not exists public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null,
  weight numeric,
  bf numeric,
  waist numeric,
  neck numeric,
  hip numeric,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null,
  steps int,
  water_ml int,
  primary key (user_id, date)
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null,
  kcal numeric not null default 0,      -- на 100 г
  protein numeric not null default 0,
  fat numeric not null default 0,
  carbs numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null,
  meal text not null default 'snack' check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  grams numeric,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  carbs numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null,
  weekdays int[] not null default '{}',   -- 1 = пн … 7 = вс
  exercises jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  template_id uuid references public.workout_templates on delete set null,
  date date not null,
  name text not null,
  sets jsonb not null default '[]',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null,
  dose text,
  times text[] not null default '{}',     -- '08:00'
  weekdays int[] not null default '{1,2,3,4,5,6,7}',
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.med_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  medication_id uuid not null references public.medications on delete cascade,
  date date not null,
  time text not null,
  taken_at timestamptz not null default now(),
  unique (medication_id, date, time)
);

create table if not exists public.finance_tx (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null,
  due date,
  priority int not null default 0,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists body_logs_user_date on public.body_logs (user_id, date);
create index if not exists food_logs_user_date on public.food_logs (user_id, date);
create index if not exists workout_logs_user_date on public.workout_logs (user_id, date);
create index if not exists med_logs_user_date on public.med_logs (user_id, date);
create index if not exists finance_tx_user_date on public.finance_tx (user_id, date);

-- ───────────── Права доступа ─────────────
-- Писать можно только свои записи. Читать: свои + партнёра (скрытые разделы — по флагу владельца).
do $$
declare t text; vis text;
begin
  foreach t in array array['body_logs','daily_logs','foods','food_logs','workout_templates','workout_logs','tasks',
                           'medications','med_logs','finance_tx'] loop
    vis := case
      when t in ('medications','med_logs') then 'public.can_view_private(user_id, ''meds'')'
      when t = 'finance_tx' then 'public.can_view_private(user_id, ''finance'')'
      else 'public.can_view(user_id)'
    end;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for select using (%s)', t || '_select', t, vis);
    execute format('create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
                   t || '_write', t);
  end loop;
end $$;

-- ───────────── Права ролей ─────────────
grant usage on schema public to anon, authenticated;

grant select, insert, delete on public.profiles to authenticated;
revoke update on public.profiles from authenticated, anon;
grant update (name, sex, birth_year, height_cm, activity, goal_bf, goal_weight, goal_steps, goal_water_ml,
              goal_kcal, goal_protein, goal_fat, goal_carbs, share_finance, share_meds, share_photos)
  on public.profiles to authenticated;

grant select, insert, update, delete on
  public.body_logs, public.daily_logs, public.foods, public.food_logs,
  public.workout_templates, public.workout_logs, public.medications, public.med_logs,
  public.finance_tx, public.tasks
  to authenticated;

grant execute on function public.can_view(uuid), public.can_view_private(uuid, text),
  public.link_partner(text), public.unlink_partner() to authenticated;
-- Синхронизация шагов из «Здоровья» через «Команды» iPhone.
-- Команда отправляет шаги с личным ключом; ключ видит только владелец.

create table if not exists public.sync_tokens (
  user_id uuid primary key references public.profiles on delete cascade,
  token text unique not null,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sync_tokens enable row level security;
drop policy if exists sync_tokens_own on public.sync_tokens;
create policy sync_tokens_own on public.sync_tokens for select using (user_id = auth.uid());
grant select on public.sync_tokens to authenticated;

-- Создать или заменить личный ключ (старый перестаёт работать)
create or replace function public.regen_sync_token()
returns text language plpgsql security definer set search_path = public as $$
declare t text := replace(gen_random_uuid()::text, '-', '');
begin
  insert into sync_tokens (user_id, token) values (auth.uid(), t)
  on conflict (user_id) do update set token = excluded.token, last_sync_at = null;
  return t;
end $$;

-- Вызывается из «Команд» без входа в аккаунт: ключ определяет пользователя
create or replace function public.sync_steps(token text, day date, steps numeric)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from sync_tokens s where s.token = sync_steps.token;
  if uid is null then raise exception 'Неверный ключ синхронизации'; end if;
  if steps is null or steps < 0 or steps > 200000 then raise exception 'Странное число шагов'; end if;
  insert into daily_logs (user_id, date, steps) values (uid, day, round(steps))
  on conflict (user_id, date) do update set steps = excluded.steps;
  update sync_tokens set last_sync_at = now() where user_id = uid;
  return 'ok';
end $$;

revoke execute on function public.sync_steps(text, date, numeric) from public;
grant execute on function public.sync_steps(text, date, numeric) to anon, authenticated;
revoke execute on function public.regen_sync_token() from public, anon;
grant execute on function public.regen_sync_token() to authenticated;

-- Расписание: один шаблон на день недели, с группами мышц
alter table public.workout_templates add column if not exists muscle_groups text[] not null default '{}';
alter table public.workout_templates add column if not exists kind text not null default 'custom';

-- Фото тела
create table if not exists public.body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null,
  path text not null,
  pose text not null default 'front' check (pose in ('front', 'side', 'back')),
  created_at timestamptz not null default now()
);
create index if not exists body_photos_user_date on public.body_photos (user_id, date);
alter table public.body_photos enable row level security;
drop policy if exists body_photos_select on public.body_photos;
drop policy if exists body_photos_write on public.body_photos;
create policy body_photos_select on public.body_photos for select using (public.can_view_private(user_id, 'photos'));
create policy body_photos_write on public.body_photos for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.body_photos to authenticated;

-- Хранилище файлов: закрытая папка, файлы лежат в <id пользователя>/...
insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', false)
on conflict (id) do nothing;

drop policy if exists body_photos_read on storage.objects;
drop policy if exists body_photos_upload on storage.objects;
drop policy if exists body_photos_remove on storage.objects;
create policy body_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'body-photos' and public.can_view_private(((storage.foldername(name))[1])::uuid, 'photos'));
create policy body_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy body_photos_remove on storage.objects for delete to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

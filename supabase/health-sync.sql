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

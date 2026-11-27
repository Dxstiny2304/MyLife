-- MyLife: тренировки по дням недели и фото тела.
-- Запуск: Supabase → SQL Editor → New query → вставить весь файл → Run. Можно запускать повторно.

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

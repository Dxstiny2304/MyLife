# MyLife

Личное веб-приложение для iPhone: питание и калории, вес и процент жира, шаги, вода. Дальше по плану: тренировки, лекарства, задачи, финансы.
Два аккаунта связываются в пару и видят прогресс друг друга (только просмотр).

- Фронтенд: React + Vite, устанавливается на экран «Домой» как приложение (PWA).
- База и вход: Supabase. Правила доступа в `supabase/schema.sql`.
- Публикация: GitHub Pages через `.github/workflows/deploy.yml` при каждом пуше в `main`.

## Первый запуск

1. Supabase → SQL Editor → вставить `supabase/schema.sql` → Run.
2. Supabase → Authentication → URL Configuration → Site URL: адрес сайта на GitHub Pages.
3. GitHub → Settings → Pages → Source: GitHub Actions.

## Локально

```
npm install
npm run dev
```

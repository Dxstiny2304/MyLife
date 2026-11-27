-- Права ролей на таблицы. Новые проекты Supabase не выдают их автоматически.
-- Строки по-прежнему защищены правилами доступа (RLS) из schema.sql.
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

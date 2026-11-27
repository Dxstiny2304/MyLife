import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { suggestTargets } from './calc'

// Простой хук загрузки: перезапускается при смене зависимостей
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && setState({ data: null, error: e.message || String(e), loading: false }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

const unwrap = ({ data, error }) => { if (error) throw error; return data }

export const latestBody = async (userId) => {
  const rows = unwrap(await supabase.from('body_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(20))
  // Последний вес и последний % жира могут быть из разных записей
  return {
    weight: rows.find((r) => r.weight != null)?.weight ?? null,
    bf: rows.find((r) => r.bf != null)?.bf ?? null,
    date: rows[0]?.date ?? null,
  }
}

export const bodyHistory = async (userId) =>
  unwrap(await supabase.from('body_logs').select('*').eq('user_id', userId).order('date', { ascending: true }).order('created_at', { ascending: true }))

export const foodForDay = async (userId, date) =>
  unwrap(await supabase.from('food_logs').select('*').eq('user_id', userId).eq('date', date).order('created_at'))

export const dailyFor = async (userId, date) =>
  unwrap(await supabase.from('daily_logs').select('*').eq('user_id', userId).eq('date', date).maybeSingle())

export const myFoods = async (userId) =>
  unwrap(await supabase.from('foods').select('*').eq('user_id', userId).order('name'))

export const recentFoodNames = async (userId) =>
  unwrap(await supabase.from('food_logs').select('name, grams, kcal, protein, fat, carbs').eq('user_id', userId).order('created_at', { ascending: false }).limit(60))

export async function upsertDaily(userId, date, patch) {
  const current = await dailyFor(userId, date)
  return unwrap(await supabase.from('daily_logs').upsert({ user_id: userId, date, steps: current?.steps ?? null, water_ml: current?.water_ml ?? null, ...patch }).select().single())
}

// Цели: заданные вручную, иначе рассчитанные
export function effectiveTargets(profile, body) {
  const auto = suggestTargets(profile, body)
  const pick = (k) => profile[`goal_${k}`] ?? auto?.[k] ?? null
  return {
    kcal: pick('kcal'), protein: pick('protein'), fat: pick('fat'), carbs: pick('carbs'),
    isAuto: profile.goal_kcal == null && !!auto,
    auto,
  }
}

export const sumFood = (rows) =>
  (rows || []).reduce((a, r) => ({
    kcal: a.kcal + Number(r.kcal || 0), protein: a.protein + Number(r.protein || 0),
    fat: a.fat + Number(r.fat || 0), carbs: a.carbs + Number(r.carbs || 0),
  }), { kcal: 0, protein: 0, fat: 0, carbs: 0 })

// ── Тренировки и фото ──
export const workoutTemplates = async (userId) =>
  unwrap(await supabase.from('workout_templates').select('*').eq('user_id', userId).order('created_at')).map((t) => ({
    ...t,
    kind: t.kind || 'custom',
    muscle_groups: t.muscle_groups?.length ? t.muscle_groups : [...new Set((t.exercises || []).map((e) => e.group).filter((g) => g && g !== 'custom'))],
  }))

export const workoutLogs = async (userId, fromDate) => {
  let q = supabase.from('workout_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false })
  if (fromDate) q = q.gte('date', fromDate)
  return unwrap(await q.limit(500))
}

export const bodyPhotos = async (userId) =>
  unwrap(await supabase.from('body_photos').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }))

// Шаблон на конкретный день недели (1–7)
export const templateFor = (templates, weekday) => (templates || []).find((t) => (t.weekdays || []).includes(weekday)) || null

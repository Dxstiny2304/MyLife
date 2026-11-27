import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { supabase } from '../supabase'
import { useLoad, foodForDay, myFoods, recentFoodNames, latestBody, effectiveTargets, sumFood } from '../lib/data'
import { addDays, dayLabel } from '../lib/dates'
import { fmt, parseNum } from '../lib/num'
import { DayNav, Icon, MacroBar } from '../ui'

export const MEALS = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекус' },
]

const mealByTime = () => {
  const h = new Date().getHours()
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack'
}

export default function Food() {
  const { viewing, date, setDate, version, bump, readOnly, openQuick } = useApp()
  const { data, loading } = useLoad(async () => {
    const [rows, body] = await Promise.all([foodForDay(viewing.id, date), latestBody(viewing.id)])
    return { rows, body }
  }, [viewing.id, date, version])
  const rows = data?.rows || []
  const total = sumFood(rows)
  const t = effectiveTargets(viewing, data?.body || {})

  async function remove(id) {
    await supabase.from('food_logs').delete().eq('id', id)
    bump()
  }

  return (
    <>
      <DayNav date={date} setDate={(n) => setDate(addDays(date, n))} label={dayLabel(date)} />
      <section className="card" aria-label="Итог дня">
        <div className="card-head">
          <div className="big">{fmt(total.kcal)}<small>/ {fmt(t.kcal)} ккал</small></div>
        </div>
        <div className="macros">
          <MacroBar label="Белки" value={total.protein} goal={t.protein} color="var(--protein)" />
          <MacroBar label="Жиры" value={total.fat} goal={t.fat} color="var(--fat)" />
          <MacroBar label="Углеводы" value={total.carbs} goal={t.carbs} color="var(--carbs)" />
        </div>
      </section>

      {MEALS.map((m) => {
        const items = rows.filter((r) => r.meal === m.id)
        const kcal = sumFood(items).kcal
        return (
          <section className="card" key={m.id} aria-label={m.label}>
            <div className="card-head">
              <h2 className="card-title">{m.label}</h2>
              <span className="sub num">{fmt(kcal)} ккал</span>
            </div>
            <div className="list">
              {items.length === 0 && <div className="empty">{loading ? 'Загрузка…' : 'Ничего не записано'}</div>}
              {items.map((r) => (
                <div className="row" key={r.id}>
                  <div className="row-main">
                    <div className="name">{r.name}</div>
                    <div className="meta num">{r.grams ? `${fmt(r.grams)} г · ` : ''}Б {fmt(r.protein)} · Ж {fmt(r.fat)} · У {fmt(r.carbs)}</div>
                  </div>
                  <div className="row-end">{fmt(r.kcal)}</div>
                  {!readOnly && <button className="del" onClick={() => remove(r.id)} aria-label={`Удалить ${r.name}`}><Icon name="trash" /></button>}
                </div>
              ))}
            </div>
          </section>
        )
      })}
      {!readOnly && <button className="btn" onClick={() => openQuick('food')}>Добавить еду</button>}
    </>
  )
}

export function FoodForm({ date, onSaved }) {
  const { me } = useApp()
  const { data } = useLoad(async () => {
    const [foods, recent] = await Promise.all([myFoods(me.id), recentFoodNames(me.id)])
    return { foods, recent }
  }, [me.id])

  const [meal, setMeal] = useState(mealByTime())
  const [name, setName] = useState('')
  const [grams, setGrams] = useState('')
  const [per100, setPer100] = useState(true)
  const [m, setM] = useState({ kcal: '', protein: '', fat: '', carbs: '' })
  const [save, setSave] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Подсказки: мои продукты, потом недавние записи (на 100 г пересчитываем из порции)
  const catalog = useMemo(() => {
    const map = new Map()
    for (const f of data?.foods || []) map.set(f.name.toLowerCase(), { name: f.name, kcal: f.kcal, protein: f.protein, fat: f.fat, carbs: f.carbs, saved: true })
    for (const r of data?.recent || []) {
      const k = r.name.toLowerCase()
      if (map.has(k) || !r.grams) continue
      const f = 100 / r.grams
      map.set(k, { name: r.name, kcal: r.kcal * f, protein: r.protein * f, fat: r.fat * f, carbs: r.carbs * f })
    }
    return map
  }, [data])

  function pickName(v) {
    setName(v)
    const hit = catalog.get(v.trim().toLowerCase())
    if (hit) {
      setPer100(true)
      const r = (x) => String(Math.round(x * 10) / 10)
      setM({ kcal: r(hit.kcal), protein: r(hit.protein), fat: r(hit.fat), carbs: r(hit.carbs) })
    }
  }

  const g = parseNum(grams)
  const factor = per100 ? (g ? g / 100 : null) : 1
  const calc = (k) => (factor == null ? null : (parseNum(m[k]) ?? 0) * factor)
  const kcalNow = calc('kcal')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Напиши, что ты съел.'); return }
    if (per100 && !g) { setError('Укажи вес порции в граммах.'); return }
    setBusy(true)
    const row = {
      date, meal, name: name.trim(), grams: g,
      kcal: round1(calc('kcal')), protein: round1(calc('protein')), fat: round1(calc('fat')), carbs: round1(calc('carbs')),
    }
    const { error } = await supabase.from('food_logs').insert(row)
    if (!error && save && per100 && !catalog.get(name.trim().toLowerCase())?.saved) {
      await supabase.from('foods').insert({
        name: name.trim(), kcal: parseNum(m.kcal) ?? 0, protein: parseNum(m.protein) ?? 0, fat: parseNum(m.fat) ?? 0, carbs: parseNum(m.carbs) ?? 0,
      })
    }
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="seg-small" role="group" aria-label="Приём пищи">
        {MEALS.map((x) => <button type="button" key={x.id} aria-pressed={meal === x.id} onClick={() => setMeal(x.id)}>{x.label}</button>)}
      </div>
      <label className="field"><span>Продукт или блюдо</span>
        <input id="food-name" className="input" list="food-catalog" value={name} onChange={(e) => pickName(e.target.value)} placeholder="Куриная грудка" autoComplete="off" />
        <datalist id="food-catalog">{[...catalog.values()].map((f) => <option key={f.name} value={f.name} />)}</datalist>
      </label>
      <div className="fields2">
        <label className="field"><span>Порция, г</span>
          <input id="food-grams" className="input" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="150" />
        </label>
        <div className="field"><span>Значения</span>
          <div className="segmented" role="group">
            <button type="button" aria-pressed={per100} onClick={() => setPer100(true)}>на 100 г</button>
            <button type="button" aria-pressed={!per100} onClick={() => setPer100(false)}>на порцию</button>
          </div>
        </div>
      </div>
      <div className="fields4">
        {[['kcal', 'Ккал'], ['protein', 'Белки'], ['fat', 'Жиры'], ['carbs', 'Углев.']].map(([k, l]) => (
          <label className="field" key={k}><span>{l}</span>
            <input id={`food-${k}`} className="input" inputMode="decimal" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      {per100 && <div className="hint num">Итого: {kcalNow == null ? '—' : `${fmt(kcalNow)} ккал`}</div>}
      {per100 && (
        <label className="switch-row"><span>Сохранить в мои продукты</span>
          <input id="food-save" type="checkbox" className="switch" checked={save} onChange={(e) => setSave(e.target.checked)} />
        </label>
      )}
      {error && <div className="error">{error}</div>}
      <button className="btn" disabled={busy}>Записать</button>
    </form>
  )
}

const round1 = (x) => (x == null ? 0 : Math.round(x * 10) / 10)

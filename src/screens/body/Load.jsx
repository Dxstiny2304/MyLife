import { useMemo, useState } from 'react'
import { useApp } from '../../App'
import { useLoad, workoutLogs } from '../../lib/data'
import { addDays, shortDate, today } from '../../lib/dates'
import { fmt } from '../../lib/num'
import { GROUPS, e1rm, tonnage, weekStart } from '../../lib/training'
import { LineChart } from '../../ui'

export default function Load() {
  const { viewing, version } = useApp()
  const from = addDays(weekStart(today()), -7 * 11)
  const { data } = useLoad(() => workoutLogs(viewing.id, from), [viewing.id, version])
  const logs = data || []

  // Тоннаж по неделям (12 недель, пустые недели = 0)
  const weekly = useMemo(() => {
    const m = new Map()
    for (let i = 0; i < 12; i++) m.set(addDays(from, i * 7), 0)
    for (const l of logs) {
      const w = weekStart(l.date)
      if (m.has(w)) m.set(w, m.get(w) + tonnage(l.sets))
    }
    return [...m].map(([date, value]) => ({ date, value: Math.round(value) }))
  }, [logs, from])
  const hasAny = weekly.some((w) => w.value > 0)

  // Подходы по группам: эта неделя и прошлая
  const thisW = weekStart(today())
  const prevW = addDays(thisW, -7)
  const perGroup = useMemo(() => {
    const m = new Map(GROUPS.map((g) => [g.id, { now: 0, prev: 0 }]))
    for (const l of logs) {
      const w = weekStart(l.date)
      const key = w === thisW ? 'now' : w === prevW ? 'prev' : null
      if (!key) continue
      for (const s of l.sets || []) if (m.has(s.group)) m.get(s.group)[key] += 1
    }
    return GROUPS.map((g) => ({ ...g, ...m.get(g.id) })).filter((g) => g.now || g.prev)
  }, [logs, thisW, prevW])
  const maxSets = Math.max(20, ...perGroup.map((g) => Math.max(g.now, g.prev)))

  // Прогресс в упражнении: лучший расчётный максимум за тренировку
  const exercises = useMemo(() => {
    const count = new Map()
    for (const l of logs) for (const s of l.sets || []) if (s.weight) count.set(s.exercise, (count.get(s.exercise) || 0) + 1)
    return [...count].sort((a, b) => b[1] - a[1]).map(([n]) => n)
  }, [logs])
  const [ex, setEx] = useState('')
  const current = ex || exercises[0] || ''
  const exPoints = useMemo(() => {
    const m = new Map()
    for (const l of logs) for (const s of l.sets || []) {
      if (s.exercise !== current) continue
      m.set(l.date, Math.max(m.get(l.date) || 0, e1rm(s.weight, s.reps)))
    }
    return [...m].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, v]) => ({ date, value: Math.round(v * 10) / 10 }))
  }, [logs, current])

  return (
    <>
      <section className="card" aria-label="Тоннаж по неделям">
        <div className="card-head">
          <h2 className="card-title">Тоннаж по неделям</h2>
          <span className="sub num">эта неделя {fmt(weekly[weekly.length - 1]?.value)} кг</span>
        </div>
        {hasAny ? <LineChart points={weekly} digits={0} unit="кг" /> : <div className="empty">Запиши первую тренировку, и здесь появится график. Тоннаж = вес × повторы по всем подходам.</div>}
      </section>

      <section className="card" aria-label="Подходы по группам мышц">
        <div className="card-head">
          <h2 className="card-title">Подходы за неделю</h2>
          <span className="legend"><i className="lg now" />эта <i className="lg prev" />прошлая</span>
        </div>
        {perGroup.length === 0 && <div className="empty">На этой и прошлой неделе подходов не было.</div>}
        {perGroup.map((g) => (
          <div className="gbar" key={g.id}>
            <span className="gbar-label">{g.label}</span>
            <div className="gbar-track">
              <i className="prev" style={{ width: `${(g.prev / maxSets) * 100}%` }} />
              <i className="now" style={{ width: `${(g.now / maxSets) * 100}%` }} />
              <span className="gbar-zone" style={{ left: `${(10 / maxSets) * 100}%`, width: `${(10 / maxSets) * 100}%` }} />
            </div>
            <span className="num gbar-val">{g.now}</span>
          </div>
        ))}
        {perGroup.length > 0 && <p className="hint" style={{ margin: 0 }}>Полоса-подсказка: 10–20 подходов на группу в неделю, обычный ориентир для роста мышц.</p>}
      </section>

      <section className="card" aria-label="Прогресс в упражнении">
        <h2 className="card-title">Сила в упражнении</h2>
        {exercises.length === 0 ? <div className="empty">Нет упражнений с весом.</div> : (
          <>
            <select id="load-ex" className="select input" value={current} onChange={(e) => setEx(e.target.value)}>
              {exercises.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <LineChart points={exPoints} digits={1} unit="кг" />
            <p className="hint" style={{ margin: 0 }}>Расчётный максимум на 1 повтор по лучшему подходу дня (формула Эпли).{exPoints.length ? ` Последний: ${fmt(exPoints[exPoints.length - 1].value, 1)} кг, ${shortDate(exPoints[exPoints.length - 1].date)}.` : ''}</p>
          </>
        )}
      </section>
    </>
  )
}

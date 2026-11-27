import { useState } from 'react'
import { useApp } from '../App'
import { WorkoutSheet } from './body/Training'
import { groupLabel, isoWeekday, tonnage } from '../lib/training'
import { fromISO } from '../lib/dates'
import { useLoad, latestBody, foodForDay, dailyFor, effectiveTargets, sumFood, workoutTemplates, workoutLogs, templateFor } from '../lib/data'
import { addDays, dayLabel } from '../lib/dates'
import { fmt } from '../lib/num'
import { DayNav, MacroBar, Ring } from '../ui'

export default function Today() {
  const { viewing, date, setDate, version, bump, readOnly, openQuick, goTab } = useApp()
  const [session, setSession] = useState(null)
  const { data } = useLoad(async () => {
    const [body, food, daily, templates, logs] = await Promise.all([
      latestBody(viewing.id), foodForDay(viewing.id, date), dailyFor(viewing.id, date), workoutTemplates(viewing.id), workoutLogs(viewing.id),
    ])
    return { body, food, daily, templates, logs }
  }, [viewing.id, date, version])
  const plan = templateFor(data?.templates, isoWeekday(fromISO(date)))
  const done = (data?.logs || []).find((l) => l.date === date && (!plan || l.template_id === plan.id))

  const body = data?.body
  const eaten = sumFood(data?.food)
  const t = effectiveTargets(viewing, body || {})
  const water = data?.daily?.water_ml ?? 0
  const toGoal = body?.bf != null && viewing.goal_bf != null ? body.bf - viewing.goal_bf : null

  return (
    <>
      <DayNav date={date} setDate={(n) => setDate(addDays(date, n))} label={dayLabel(date)} />

      <section className="card" aria-label="Калории">
        <div className="card-head">
          <h2 className="card-title">Калории</h2>
          {!readOnly && <button className="card-link" onClick={() => openQuick('food')}>Добавить еду</button>}
        </div>
        <div className="ring-wrap">
          <Ring value={eaten.kcal} goal={t.kcal} label="Калории" unit="ккал" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div className="big">{fmt(eaten.kcal)}<small>ккал</small></div>
            <div className="sub">{t.kcal ? <>из {fmt(t.kcal)}{t.isAuto ? ' (расчёт)' : ''}</> : 'Норма появится, когда будет вес'}</div>
          </div>
        </div>
        <div className="macros">
          <MacroBar label="Белки" value={eaten.protein} goal={t.protein} color="var(--protein)" />
          <MacroBar label="Жиры" value={eaten.fat} goal={t.fat} color="var(--fat)" />
          <MacroBar label="Углеводы" value={eaten.carbs} goal={t.carbs} color="var(--carbs)" />
        </div>
      </section>

      <section className="card" aria-label="Тренировка">
        <div className="card-head">
          <h2 className="card-title">Тренировка</h2>
          <button className="card-link" onClick={() => goTab('body')}>Расписание</button>
        </div>
        {plan ? (
          <>
            <div className="big" style={{ fontSize: 26 }}>{plan.name}</div>
            <div className="sub">{(plan.muscle_groups || []).map(groupLabel).join(', ')}</div>
            {done && <div><span className="pill good">Сделано · {Math.round(tonnage(done.sets)).toLocaleString('ru-RU')} кг</span></div>}
            {!readOnly && <button className={`btn${done ? ' secondary' : ''}`} onClick={() => setSession({ template: plan, date, log: done })}>{done ? 'Открыть запись' : 'Начать тренировку'}</button>}
          </>
        ) : done ? (
          <span className="pill good">{done.name}: сделано</span>
        ) : (
          <div className="sub">По расписанию отдых.</div>
        )}
      </section>

      <section className="card" aria-label="Вода">
          <div className="card-head">
            <h2 className="card-title">Вода</h2>
            {!readOnly && <button className="card-link" onClick={() => openQuick('water')}>Добавить</button>}
          </div>
          <div className="big">{fmt(water / 1000, 1)}<small>л</small></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (water / (viewing.goal_water_ml || 2500)) * 100)}%`, background: 'var(--protein)' }} /></div>
          <div className="sub num">цель {fmt((viewing.goal_water_ml || 2500) / 1000, 1)} л</div>
        </section>

      <section className="card" aria-label="Тело">
        <div className="card-head">
          <h2 className="card-title">Тело</h2>
          <button className="card-link" onClick={() => goTab('body')}>График</button>
        </div>
        <div className="grid2">
          <div>
            <div className="big">{fmt(body?.bf, 1)}<small>% жира</small></div>
            <div className="sub">
              {toGoal == null ? 'Цель не задана' : toGoal > 0 ? <>до цели {fmt(viewing.goal_bf, 0)}%: <span className="num">−{fmt(toGoal, 1)}</span></> : <span className="pill good">Цель достигнута</span>}
            </div>
          </div>
          <div>
            <div className="big">{fmt(body?.weight, 1)}<small>кг</small></div>
            <div className="sub">{body?.weight && body?.bf ? <>сухая масса {fmt(body.weight * (1 - body.bf / 100), 1)} кг</> : body?.date ? '' : 'Нет записей'}</div>
          </div>
        </div>
        {!readOnly && <button className="btn secondary small" onClick={() => openQuick('body')}>Записать вес или % жира</button>}
      </section>
      {session && <WorkoutSheet {...session} logs={data?.logs || []} onClose={() => setSession(null)} onSaved={() => { setSession(null); bump() }} />}
    </>
  )
}

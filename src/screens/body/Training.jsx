import { useMemo, useState } from 'react'
import { useApp } from '../../App'
import { supabase } from '../../supabase'
import { useLoad, workoutTemplates, workoutLogs, templateFor } from '../../lib/data'
import { today, shortDate } from '../../lib/dates'
import { fmt, parseNum } from '../../lib/num'
import { DAY_KINDS, EXERCISES, GROUPS, WEEKDAYS, groupLabel, isoWeekday, kindLabel, tonnage } from '../../lib/training'
import { Icon, Sheet } from '../../ui'

export default function Training() {
  const { viewing, version, bump, readOnly } = useApp()
  const { data } = useLoad(async () => {
    const [templates, logs] = await Promise.all([workoutTemplates(viewing.id), workoutLogs(viewing.id)])
    return { templates, logs }
  }, [viewing.id, version])
  const [editDay, setEditDay] = useState(null)
  const [session, setSession] = useState(null)
  const templates = data?.templates || []
  const logs = data?.logs || []
  const todayN = isoWeekday(new Date())
  const todayT = templateFor(templates, todayN)
  const todayLog = todayT && logs.find((l) => l.date === today() && l.template_id === todayT.id)

  async function removeLog(id) {
    await supabase.from('workout_logs').delete().eq('id', id)
    bump()
  }

  return (
    <>
      <section className="card" aria-label="Сегодня">
        <div className="card-head">
          <h2 className="card-title">Сегодня, {WEEKDAYS[todayN - 1].long.toLowerCase()}</h2>
          {todayLog && <span className="pill good">Сделано</span>}
        </div>
        {todayT ? (
          <>
            <div className="big" style={{ fontSize: 26 }}>{todayT.name}</div>
            <div className="chips">{(todayT.muscle_groups || []).map((g) => <span className="chip" key={g}>{groupLabel(g)}</span>)}</div>
            {!readOnly && (
              <button className="btn" onClick={() => setSession({ template: todayT, date: today(), log: todayLog })}>
                {todayLog ? 'Открыть запись' : 'Начать тренировку'}
              </button>
            )}
          </>
        ) : (
          <div className="sub">По расписанию день отдыха.</div>
        )}
      </section>

      <section className="card" aria-label="Расписание">
        <div className="card-head">
          <h2 className="card-title">Расписание недели</h2>
        </div>
        <div className="list">
          {WEEKDAYS.map((d) => {
            const t = templateFor(templates, d.n)
            return (
              <button key={d.n} className={`row week-row${d.n === todayN ? ' is-today' : ''}`} onClick={() => !readOnly && setEditDay(d.n)} disabled={readOnly}>
                <span className="wd">{d.short}</span>
                <span className="row-main">
                  <span className="name">{t ? t.name : 'Отдых'}</span>
                  {t && <span className="meta">{(t.muscle_groups || []).map(groupLabel).join(', ')} · упражнений: {(t.exercises || []).length}</span>}
                </span>
                {!readOnly && <Icon name="right" className="chev" />}
              </button>
            )
          })}
        </div>
      </section>

      <section className="card" aria-label="История">
        <h2 className="card-title">Последние тренировки</h2>
        <div className="list">
          {logs.length === 0 && <div className="empty">Пока ни одной записи.</div>}
          {logs.slice(0, 12).map((l) => (
            <div className="row" key={l.id}>
              <div className="row-main">
                <div className="name">{l.name}</div>
                <div className="meta num">{shortDate(l.date)} · подходов {(l.sets || []).length}</div>
              </div>
              <div className="row-end">{fmt(tonnage(l.sets))} кг</div>
              {!readOnly && (
                <>
                  <button className="del" onClick={() => setSession({ template: templates.find((t) => t.id === l.template_id) || null, date: l.date, log: l })} aria-label="Изменить"><Icon name="right" /></button>
                  <button className="del" onClick={() => removeLog(l.id)} aria-label="Удалить тренировку"><Icon name="trash" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {editDay && <DayEditor weekday={editDay} template={templateFor(templates, editDay)} onClose={() => setEditDay(null)} onSaved={() => { setEditDay(null); bump() }} />}
      {session && <WorkoutSheet {...session} logs={logs} onClose={() => setSession(null)} onSaved={() => { setSession(null); bump() }} />}
    </>
  )
}

// ── Настройка дня недели ──
function DayEditor({ weekday, template, onClose, onSaved }) {
  const [kind, setKind] = useState(template?.kind || (template ? 'custom' : 'rest'))
  const [name, setName] = useState(template?.name || '')
  const [groups, setGroups] = useState(template?.muscle_groups || [])
  const [exercises, setExercises] = useState(template?.exercises || [])
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function pickKind(k) {
    setKind(k.id)
    if (k.id !== 'custom') { setGroups(k.groups); setName(k.id === 'rest' ? '' : k.label) }
    if (k.id === 'rest') setExercises([])
    else setExercises((ex) => ex.filter((e) => k.id === 'custom' || k.groups.includes(e.group)))
  }
  function toggleGroup(id) {
    setGroups((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))
    setExercises((ex) => (groups.includes(id) ? ex.filter((e) => e.group !== id) : ex))
  }
  const has = (n) => exercises.some((e) => e.name === n)
  function toggleEx(n, group) {
    setExercises((ex) => (has(n) ? ex.filter((e) => e.name !== n) : [...ex, { name: n, group, sets: 3, reps: 10 }]))
  }
  function addCustom() {
    const n = custom.trim()
    if (!n || has(n)) return
    setExercises((ex) => [...ex, { name: n, group: groups[0] || 'custom', sets: 3, reps: 10 }])
    setCustom('')
  }
  const setEx = (i, k, v) => setExercises((ex) => ex.map((e, j) => (j === i ? { ...e, [k]: v } : e)))

  async function save() {
    setBusy(true); setError('')
    let res
    if (kind === 'rest') {
      res = template ? await supabase.from('workout_templates').delete().eq('id', template.id) : { error: null }
    } else {
      const row = {
        name: name.trim() || kindLabel(kind), kind, weekdays: [weekday], muscle_groups: groups,
        exercises: exercises.map((e) => ({ ...e, sets: parseNum(e.sets) || 3, reps: parseNum(e.reps) || 10 })),
      }
      res = template
        ? await supabase.from('workout_templates').update(row).eq('id', template.id)
        : await supabase.from('workout_templates').insert(row)
    }
    setBusy(false)
    if (res.error) setError(res.error.message)
    else onSaved()
  }

  return (
    <Sheet title={WEEKDAYS[weekday - 1].long} onClose={onClose}>
      <div className="field"><span className="hint">Тип дня</span>
        <div className="seg-small">
          {DAY_KINDS.map((k) => <button type="button" key={k.id} aria-pressed={kind === k.id} onClick={() => pickKind(k)}>{k.label}</button>)}
        </div>
      </div>
      {kind !== 'rest' && (
        <>
          <label className="field"><span>Название</span>
            <input id="day-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Верх А" />
          </label>
          <div className="field"><span className="hint">Группы мышц</span>
            <div className="seg-small">
              {GROUPS.map((g) => <button type="button" key={g.id} aria-pressed={groups.includes(g.id)} onClick={() => toggleGroup(g.id)}>{g.label}</button>)}
            </div>
          </div>
          {groups.map((g) => (
            <div className="field" key={g}><span className="hint">{groupLabel(g)}: упражнения</span>
              <div className="seg-small">
                {(EXERCISES[g] || []).map((n) => <button type="button" key={n} aria-pressed={has(n)} onClick={() => toggleEx(n, g)}>{n}</button>)}
              </div>
            </div>
          ))}
          <div className="fields2" style={{ gridTemplateColumns: '1fr auto' }}>
            <input id="day-custom" className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Своё упражнение" />
            <button type="button" className="btn secondary" onClick={addCustom}>Добавить</button>
          </div>
          {exercises.length > 0 && (
            <div className="card" style={{ padding: 12 }}>
              <div className="ex-head"><span>Упражнение</span><span>Подх.</span><span>Повт.</span><span /></div>
              {exercises.map((e, i) => (
                <div className="ex-row" key={e.name}>
                  <span className="ex-name">{e.name}</span>
                  <input className="input mini" inputMode="numeric" value={e.sets} onChange={(ev) => setEx(i, 'sets', ev.target.value)} aria-label={`Подходы: ${e.name}`} />
                  <input className="input mini" inputMode="numeric" value={e.reps} onChange={(ev) => setEx(i, 'reps', ev.target.value)} aria-label={`Повторы: ${e.name}`} />
                  <button type="button" className="del" onClick={() => setExercises((ex) => ex.filter((_, j) => j !== i))} aria-label={`Убрать ${e.name}`}><Icon name="close" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {error && <div className="error">{error}</div>}
      <button className="btn" onClick={save} disabled={busy}>Сохранить</button>
    </Sheet>
  )
}

// ── Запись тренировки ──
export function WorkoutSheet({ template, date, log, logs, onClose, onSaved }) {
  // Прошлый результат по каждому упражнению
  const last = useMemo(() => {
    const m = new Map()
    for (const l of logs || []) {
      if (log && l.id === log.id) continue
      for (const s of l.sets || []) {
        if (!m.has(s.exercise)) m.set(s.exercise, { date: l.date, sets: [] })
        if (m.get(s.exercise).date === l.date) m.get(s.exercise).sets.push(s)
      }
    }
    return m
  }, [logs, log])

  const initial = () => {
    if (log) {
      const by = new Map()
      for (const s of log.sets || []) {
        if (!by.has(s.exercise)) by.set(s.exercise, { name: s.exercise, group: s.group, sets: [] })
        by.get(s.exercise).sets.push({ reps: String(s.reps ?? ''), weight: String(s.weight ?? '') })
      }
      return [...by.values()]
    }
    return (template?.exercises || []).map((e) => ({ name: e.name, group: e.group, target: `${e.sets}×${e.reps}`, sets: Array.from({ length: e.sets || 3 }, () => ({ reps: '', weight: '' })) }))
  }
  const [items, setItems] = useState(initial)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setSet = (i, j, k, v) => setItems((it) => it.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.map((s, b) => (b === j ? { ...s, [k]: v } : s)) })))
  const addSet = (i) => setItems((it) => it.map((e, a) => (a !== i ? e : { ...e, sets: [...e.sets, { ...(e.sets[e.sets.length - 1] || { reps: '', weight: '' }) }] })))

  async function save() {
    const sets = []
    for (const e of items) for (const s of e.sets) {
      const reps = parseNum(s.reps)
      if (!reps) continue
      sets.push({ exercise: e.name, group: e.group, reps, weight: parseNum(s.weight) ?? 0 })
    }
    if (sets.length === 0) { setError('Заполни хотя бы один подход: повторы и вес.'); return }
    setBusy(true); setError('')
    const row = { date, template_id: template?.id ?? log?.template_id ?? null, name: template?.name || log?.name || 'Тренировка', sets }
    const { error } = log
      ? await supabase.from('workout_logs').update(row).eq('id', log.id)
      : await supabase.from('workout_logs').insert(row)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <Sheet title={`${template?.name || log?.name || 'Тренировка'} · ${shortDate(date)}`} onClose={onClose}>
      {items.map((e, i) => {
        const prev = last.get(e.name)
        return (
          <section className="card" key={e.name} style={{ padding: 12 }}>
            <div className="card-head">
              <strong>{e.name}</strong>
              {e.target && <span className="sub num">план {e.target}</span>}
            </div>
            {prev && <div className="hint num">В прошлый раз ({shortDate(prev.date)}): {prev.sets.map((s) => `${fmt(s.weight, s.weight % 1 ? 1 : 0)}×${s.reps}`).join(', ')}</div>}
            <div className="set-head"><span>#</span><span>Вес, кг</span><span>Повторы</span></div>
            {e.sets.map((s, j) => (
              <div className="set-row" key={j}>
                <span className="sub num">{j + 1}</span>
                <input className="input mini" inputMode="decimal" value={s.weight} onChange={(ev) => setSet(i, j, 'weight', ev.target.value)}
                  placeholder={prev?.sets[j] ? fmt(prev.sets[j].weight, prev.sets[j].weight % 1 ? 1 : 0) : ''} aria-label={`${e.name}, подход ${j + 1}, вес`} />
                <input className="input mini" inputMode="numeric" value={s.reps} onChange={(ev) => setSet(i, j, 'reps', ev.target.value)}
                  placeholder={prev?.sets[j] ? String(prev.sets[j].reps) : ''} aria-label={`${e.name}, подход ${j + 1}, повторы`} />
              </div>
            ))}
            <button type="button" className="card-link" onClick={() => addSet(i)} style={{ alignSelf: 'flex-start' }}>+ подход</button>
          </section>
        )
      })}
      <div className="fields2" style={{ gridTemplateColumns: '1fr auto' }}>
        <input id="ws-custom" className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Добавить упражнение" />
        <button type="button" className="btn secondary" onClick={() => {
          const n = custom.trim(); if (!n) return
          setItems((it) => [...it, { name: n, group: template?.muscle_groups?.[0] || 'custom', sets: [{ reps: '', weight: '' }] }]); setCustom('')
        }}>Добавить</button>
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn" onClick={save} disabled={busy}>Сохранить тренировку</button>
    </Sheet>
  )
}


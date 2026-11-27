import { useState } from 'react'
import { useApp } from '../App'
import { supabase } from '../supabase'
import { useLoad, dailyFor, upsertDaily } from '../lib/data'
import { navyBodyFat } from '../lib/calc'
import { fmt, parseNum } from '../lib/num'
import { today } from '../lib/dates'

export function QuickBody({ onSaved }) {
  const { me } = useApp()
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [bf, setBf] = useState('')
  const [measure, setMeasure] = useState(false)
  const [mm, setMm] = useState({ waist: '', neck: '', hip: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const navy = navyBodyFat({ sex: me.sex, height: parseNum(me.height_cm), waist: parseNum(mm.waist), neck: parseNum(mm.neck), hip: parseNum(mm.hip) })
  const bfValue = measure ? navy : parseNum(bf)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (parseNum(weight) == null && bfValue == null) { setError('Заполни вес или % жира.'); return }
    setBusy(true)
    const { error } = await supabase.from('body_logs').insert({
      date, weight: parseNum(weight), bf: bfValue,
      waist: measure ? parseNum(mm.waist) : null, neck: measure ? parseNum(mm.neck) : null, hip: measure ? parseNum(mm.hip) : null,
    })
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field"><span>Дата</span>
        <input id="qb-date" className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field"><span>Вес, кг</span>
        <input id="qb-weight" className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="78,4" />
      </label>
      <div className="segmented" role="group" aria-label="Как узнать % жира">
        <button type="button" aria-pressed={!measure} onClick={() => setMeasure(false)}>Знаю % жира</button>
        <button type="button" aria-pressed={measure} onClick={() => setMeasure(true)}>По замерам</button>
      </div>
      {!measure ? (
        <label className="field"><span>% жира (с весов или калипера)</span>
          <input id="qb-bf" className="input" inputMode="decimal" value={bf} onChange={(e) => setBf(e.target.value)} placeholder="16,5" />
        </label>
      ) : (
        <>
          <div className={me.sex === 'f' ? 'fields3' : 'fields2'}>
            <label className="field"><span>Талия, см</span>
              <input id="qb-waist" className="input" inputMode="decimal" value={mm.waist} onChange={(e) => setMm({ ...mm, waist: e.target.value })} />
            </label>
            <label className="field"><span>Шея, см</span>
              <input id="qb-neck" className="input" inputMode="decimal" value={mm.neck} onChange={(e) => setMm({ ...mm, neck: e.target.value })} />
            </label>
            {me.sex === 'f' && (
              <label className="field"><span>Бёдра, см</span>
                <input id="qb-hip" className="input" inputMode="decimal" value={mm.hip} onChange={(e) => setMm({ ...mm, hip: e.target.value })} />
              </label>
            )}
          </div>
          <div className="hint">
            {me.height_cm ? <>Формула ВМС США. Результат: <strong className="num">{navy == null ? '—' : `${fmt(navy, 1)}%`}</strong>.</> : 'Укажи рост в профиле, чтобы считать по замерам.'}
            <br />Талию мерь на уровне пупка, шею под кадыком{me.sex === 'f' ? ', бёдра по самой широкой точке' : ''}.
          </div>
        </>
      )}
      {error && <div className="error">{error}</div>}
      <button className="btn" disabled={busy}>Записать</button>
    </form>
  )
}

export function QuickSteps({ date, onSaved }) {
  const { me } = useApp()
  const { data } = useLoad(() => dailyFor(me.id, date), [me.id, date])
  const [steps, setSteps] = useState(null)
  const [error, setError] = useState('')
  const value = steps ?? (data?.steps != null ? String(data.steps) : '')

  async function submit(e) {
    e.preventDefault()
    try {
      await upsertDaily(me.id, date, { steps: Math.round(parseNum(value) ?? 0) })
      onSaved()
    } catch (err) { setError(err.message) }
  }
  return (
    <form className="form" onSubmit={submit}>
      <label className="field"><span>Шагов за день</span>
        <input id="qs-steps" className="input" inputMode="numeric" value={value} onChange={(e) => setSteps(e.target.value)} placeholder="10 000" autoFocus />
      </label>
      <p className="hint">Число шагов смотри в приложении «Здоровье». Автоматический импорт сделаем позже.</p>
      {error && <div className="error">{error}</div>}
      <button className="btn">Сохранить</button>
    </form>
  )
}

export function QuickWater({ date, onSaved }) {
  const { me } = useApp()
  const { data } = useLoad(() => dailyFor(me.id, date), [me.id, date])
  const [error, setError] = useState('')
  const current = data?.water_ml ?? 0
  async function add(ml) {
    try {
      await upsertDaily(me.id, date, { water_ml: Math.max(0, current + ml) })
      onSaved()
    } catch (err) { setError(err.message) }
  }
  return (
    <div className="form">
      <div className="big">{fmt(current / 1000, 2)}<small>л сейчас</small></div>
      <div className="btn-row">
        <button className="btn" onClick={() => add(250)}>+250 мл</button>
        <button className="btn" onClick={() => add(500)}>+500 мл</button>
      </div>
      <button className="btn secondary" onClick={() => add(-250)} disabled={current <= 0}>−250 мл</button>
      {error && <div className="error">{error}</div>}
    </div>
  )
}

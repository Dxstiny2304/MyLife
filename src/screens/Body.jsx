import { useState } from 'react'
import { useApp } from '../App'
import { supabase } from '../supabase'
import { useLoad, bodyHistory } from '../lib/data'
import { addDays, shortDate, today } from '../lib/dates'
import { fmt } from '../lib/num'
import { Icon, LineChart } from '../ui'

const RANGES = [
  { id: 30, label: '30 дней' },
  { id: 90, label: '90 дней' },
  { id: 0, label: 'Всё' },
]

// Если в один день несколько записей — берём последнюю
const byDay = (rows, key) => {
  const m = new Map()
  for (const r of rows) if (r[key] != null) m.set(r.date, Number(r[key]))
  return [...m].map(([date, value]) => ({ date, value }))
}

export default function Body() {
  const { viewing, version, bump, readOnly, openQuick } = useApp()
  const [range, setRange] = useState(90)
  const t = today()
  const { data } = useLoad(async () => ({ rows: await bodyHistory(viewing.id) }), [viewing.id, version])

  const all = data?.rows || []
  const cutoff = range ? addDays(t, -range) : '0000'
  const rows = all.filter((r) => r.date >= cutoff)
  const bf = byDay(rows, 'bf')
  const weight = byDay(rows, 'weight')

  // Сухая и жировая масса: первая и последняя записи, где есть и вес, и %
  const both = rows.filter((r) => r.weight != null && r.bf != null)
  const first = both[0], last = both[both.length - 1]
  const mass = (r) => ({ lean: r.weight * (1 - r.bf / 100), fat: (r.weight * r.bf) / 100 })

  async function remove(id) {
    await supabase.from('body_logs').delete().eq('id', id)
    bump()
  }

  return (
    <>
      <div className="seg-small" role="group" aria-label="Период">
        {RANGES.map((r) => <button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
      </div>

      <section className="card" aria-label="Процент жира">
        <div className="card-head">
          <h2 className="card-title">% жира</h2>
          {bf.length > 0 && <span className="big" style={{ fontSize: 24 }}>{fmt(bf[bf.length - 1].value, 1)}%</span>}
        </div>
        <LineChart points={bf} goal={viewing.goal_bf != null ? Number(viewing.goal_bf) : null} goalLabel={`цель ${fmt(viewing.goal_bf, 0)}%`} unit="%" />
      </section>

      {first && last && first !== last && (
        <section className="card" aria-label="Рекомпозиция">
          <h2 className="card-title">Рекомпозиция с {shortDate(first.date)}</h2>
          <div className="grid2">
            <Delta label="Сухая масса" value={mass(last).lean - mass(first).lean} goodIfUp />
            <Delta label="Жировая масса" value={mass(last).fat - mass(first).fat} />
          </div>
        </section>
      )}

      <section className="card" aria-label="Вес">
        <div className="card-head">
          <h2 className="card-title">Вес</h2>
          {weight.length > 0 && <span className="big" style={{ fontSize: 24 }}>{fmt(weight[weight.length - 1].value, 1)} кг</span>}
        </div>
        <LineChart points={weight} unit="кг" />
      </section>

      <section className="card" aria-label="Записи">
        <div className="card-head">
          <h2 className="card-title">Записи</h2>
          {!readOnly && <button className="card-link" onClick={() => openQuick('body')}>Добавить</button>}
        </div>
        <div className="list">
          {all.length === 0 && <div className="empty">Пока нет записей.</div>}
          {[...all].reverse().slice(0, 30).map((r) => (
            <div className="row" key={r.id}>
              <div className="row-main">
                <div className="name">{shortDate(r.date)}</div>
                {(r.waist || r.neck) && <div className="meta num">талия {fmt(r.waist)} · шея {fmt(r.neck)}{r.hip ? ` · бёдра ${fmt(r.hip)}` : ''}</div>}
              </div>
              <div className="row-end">
                {r.weight != null && <div>{fmt(r.weight, 1)} кг</div>}
                {r.bf != null && <div className="sub">{fmt(r.bf, 1)}%</div>}
              </div>
              {!readOnly && <button className="del" onClick={() => remove(r.id)} aria-label="Удалить запись"><Icon name="trash" /></button>}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Delta({ label, value, goodIfUp }) {
  const good = goodIfUp ? value >= 0 : value <= 0
  return (
    <div>
      <div className="sub">{label}</div>
      <div className="big" style={{ fontSize: 26, color: good ? 'var(--good)' : 'var(--bad)' }}>
        {value > 0 ? '+' : value < 0 ? '−' : ''}{fmt(Math.abs(value), 1)}<small>кг</small>
      </div>
    </div>
  )
}

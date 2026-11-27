import { useEffect } from 'react'
import { fmt } from './lib/num'
import { shortDate } from './lib/dates'

// ── Иконки (линейные, 24×24) ──
const P = {
  today: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 13h3v3H8z',
  food: 'M7 3v8a2 2 0 0 0 2 2v8M5 3v5a2 2 0 0 0 2 2M9 3v5M17 3c-2 2-3 4-3 7h3v11',
  body: 'M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 8l6 1 6-1M12 9v6M9 22l3-7 3 7',
  plan: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  scale: 'M4 4h16v16H4zM8 9a4 4 0 0 1 8 0M12 9l2-2',
  water: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
}

export function Icon({ name, ...rest }) {
  const dots = name === 'more'
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={dots ? 3.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name]} />
    </svg>
  )
}

// ── Нижний лист ──
export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-inner">
          <div className="sheet-grip" />
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="iconbtn" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Кольцо прогресса ──
export function Ring({ value, goal, size = 112, label, unit }) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const ratio = goal ? Math.min(value / goal, 1) : 0
  const over = goal && value > goal
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${fmt(value)} из ${fmt(goal)}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={over ? 'var(--amber)' : 'var(--accent)'} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${c * ratio} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" fontSize="22" fontWeight="700" className="num">{fmt(goal ? Math.abs(goal - value) : value)}</text>
      <text x="50%" y="64%" textAnchor="middle" fontSize="11" fill="var(--muted)">{goal ? (over ? 'перебор' : 'осталось') : unit}</text>
    </svg>
  )
}

export function MacroBar({ label, value, goal, color }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div className="macro">
      <div className="macro-top"><span>{label}</span><span className="num sub">{fmt(value)}{goal ? ` / ${fmt(goal)}` : ''} г</span></div>
      <div className="bar"><i style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  )
}

// Аккуратные деления оси
function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1 }
  const span = max - min
  const step0 = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return ticks
}

// ── Линейный график по датам ── points: [{date, value}] по возрастанию даты
export function LineChart({ points, goal, goalLabel, digits = 1, unit = '' }) {
  if (points.length === 0) return <div className="empty">Пока нет записей.</div>
  const vals = points.map((p) => p.value)
  const lo = Math.min(...vals, goal ?? Infinity)
  const hi = Math.max(...vals, goal ?? -Infinity)
  const ticks = niceTicks(lo, hi)
  // Отступ слева под самую длинную подпись оси
  const longest = Math.max(...ticks.map((t) => fmt(t, t % 1 ? 1 : 0).length))
  const W = 340, H = 170, L = 12 + longest * 6.5, R = 10, T = 12, B = 24
  const yMin = ticks[0], yMax = ticks[ticks.length - 1]
  const t0 = new Date(points[0].date).getTime()
  const t1 = new Date(points[points.length - 1].date).getTime()
  const x = (d) => (t1 === t0 ? (L + W - R) / 2 : L + ((new Date(d).getTime() - t0) / (t1 - t0)) * (W - L - R))
  const y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const area = `${path}L${x(points[points.length - 1].date).toFixed(1)},${H - B}L${x(points[0].date).toFixed(1)},${H - B}Z`
  const xLabels = points.length === 1 ? [points[0]] : [points[0], points[points.length - 1]]
  const last = points[points.length - 1]
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`График, последнее значение ${fmt(last.value, digits)} ${unit}`}>
      <g className="grid">{ticks.map((t) => <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />)}</g>
      <g className="axis">
        {ticks.map((t) => <text key={t} x={L - 6} y={y(t) + 4} textAnchor="end">{fmt(t, t % 1 ? 1 : 0)}</text>)}
        {xLabels.map((p, i) => (
          <text key={p.date} x={x(p.date)} y={H - 6} textAnchor={xLabels.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}>{shortDate(p.date)}</text>
        ))}
      </g>
      {goal != null && (
        <>
          <line className="goal" x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} />
          <text className="goal-label" x={W - R} y={y(goal) - 5} textAnchor="end">{goalLabel}</text>
        </>
      )}
      {points.length > 1 && <path className="area" d={area} />}
      <path className="line" d={path} />
      {points.map((p, i) => (
        <circle key={p.date + i} className={`dot${i === points.length - 1 ? ' last' : ''}`} cx={x(p.date)} cy={y(p.value)} r={i === points.length - 1 ? 4.5 : points.length > 30 ? 0 : 3} />
      ))}
    </svg>
  )
}

export function DayNav({ date, setDate, label }) {
  return (
    <div className="daynav">
      <button className="iconbtn" onClick={() => setDate(-1)} aria-label="Предыдущий день"><Icon name="left" /></button>
      <strong>{label}</strong>
      <button className="iconbtn" onClick={() => setDate(1)} aria-label="Следующий день"><Icon name="right" /></button>
    </div>
  )
}

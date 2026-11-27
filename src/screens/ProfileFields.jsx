import { ACTIVITY } from '../lib/calc'

// Общие поля профиля: используются при первом входе и в настройках
export default function ProfileFields({ v, set }) {
  const on = (k) => (e) => set({ ...v, [k]: e.target.value })
  return (
    <>
      <label className="field"><span>Имя</span>
        <input id="pf-name" className="input" required value={v.name} onChange={on('name')} />
      </label>
      <div className="fields2">
        <label className="field"><span>Пол</span>
          <select id="pf-sex" className="select input" value={v.sex} onChange={on('sex')}>
            <option value="m">Мужской</option>
            <option value="f">Женский</option>
          </select>
        </label>
        <label className="field"><span>Год рождения</span>
          <input id="pf-year" className="input" inputMode="numeric" value={v.birth_year} onChange={on('birth_year')} placeholder="1999" />
        </label>
      </div>
      <div className="fields2">
        <label className="field"><span>Рост, см</span>
          <input id="pf-height" className="input" inputMode="decimal" value={v.height_cm} onChange={on('height_cm')} placeholder="180" />
        </label>
        <label className="field"><span>Цель: % жира</span>
          <input id="pf-goalbf" className="input" inputMode="decimal" value={v.goal_bf} onChange={on('goal_bf')} placeholder={v.sex === 'f' ? '22' : '12'} />
        </label>
      </div>
      <label className="field"><span>Активность</span>
        <select id="pf-activity" className="select input" value={v.activity} onChange={on('activity')}>
          {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </label>
    </>
  )
}

export const profileToForm = (p) => ({
  name: p?.name ?? '',
  sex: p?.sex ?? 'm',
  birth_year: p?.birth_year ?? '',
  height_cm: p?.height_cm ?? '',
  goal_bf: p?.goal_bf ?? '',
  activity: p?.activity ?? 1.375,
})

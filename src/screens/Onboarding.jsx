import { useState } from 'react'
import { supabase } from '../supabase'
import { parseNum } from '../lib/num'
import { today } from '../lib/dates'
import ProfileFields, { profileToForm } from './ProfileFields'

export default function Onboarding({ userId, onDone }) {
  const [v, setV] = useState(profileToForm(null))
  const [weight, setWeight] = useState('')
  const [bf, setBf] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      name: v.name.trim(),
      sex: v.sex,
      birth_year: parseNum(v.birth_year),
      height_cm: parseNum(v.height_cm),
      goal_bf: parseNum(v.goal_bf),
      activity: parseNum(v.activity) ?? 1.375,
    })
    if (!error && (parseNum(weight) || parseNum(bf))) {
      await supabase.from('body_logs').insert({ date: today(), weight: parseNum(weight), bf: parseNum(bf) })
    }
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <form className="auth" onSubmit={submit}>
      <div>
        <h1>Привет!</h1>
        <p style={{ marginTop: 8 }}>Пара вопросов, чтобы посчитать твою норму. Всё можно поменять позже.</p>
      </div>
      <div className="form">
        <ProfileFields v={v} set={setV} />
        <div className="fields2">
          <label className="field"><span>Вес сейчас, кг</span>
            <input id="ob-weight" className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <label className="field"><span>% жира сейчас</span>
            <input id="ob-bf" className="input" inputMode="decimal" value={bf} onChange={(e) => setBf(e.target.value)} placeholder="если знаешь" />
          </label>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy}>Начать</button>
      </div>
    </form>
  )
}

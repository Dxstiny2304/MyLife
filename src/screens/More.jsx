import { useState } from 'react'
import { useApp } from '../App'
import { supabase } from '../supabase'
import { useLoad, latestBody, effectiveTargets } from '../lib/data'
import { fmt, parseNum } from '../lib/num'
import ProfileFields, { profileToForm } from './ProfileFields'

export default function More() {
  return (
    <>
      <ProfileCard />
      <TargetsCard />
      <PairCard />
      <PrivacyCard />
      <section className="card">
        <h2 className="card-title">Финансы</h2>
        <p className="sub" style={{ margin: 0 }}>Доходы, расходы и бюджет появятся на этапе 4.</p>
      </section>
      <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Выйти из аккаунта</button>
    </>
  )
}

function useSaver() {
  const { reloadProfile, bump } = useApp()
  const [state, setState] = useState({ busy: false, msg: '', error: '' })
  async function save(patch) {
    setState({ busy: true, msg: '', error: '' })
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update(patch).eq('id', u.user.id)
    setState({ busy: false, msg: error ? '' : 'Сохранено', error: error?.message || '' })
    if (!error) { await reloadProfile(); bump() }
  }
  return [state, save]
}

function ProfileCard() {
  const { me } = useApp()
  const [v, setV] = useState(profileToForm(me))
  const [st, save] = useSaver()
  return (
    <form className="card form" onSubmit={(e) => {
      e.preventDefault()
      save({ name: v.name.trim(), sex: v.sex, birth_year: parseNum(v.birth_year), height_cm: parseNum(v.height_cm), goal_bf: parseNum(v.goal_bf), activity: parseNum(v.activity) })
    }}>
      <h2 className="card-title">Профиль</h2>
      <ProfileFields v={v} set={setV} />
      {st.error && <div className="error">{st.error}</div>}
      <button className="btn" disabled={st.busy}>{st.msg || 'Сохранить'}</button>
    </form>
  )
}

function TargetsCard() {
  const { me } = useApp()
  const { data: body } = useLoad(() => latestBody(me.id), [me.id])
  const t = effectiveTargets(me, body || {})
  const [v, setV] = useState({
    kcal: me.goal_kcal ?? '', protein: me.goal_protein ?? '', fat: me.goal_fat ?? '', carbs: me.goal_carbs ?? '',
    steps: me.goal_steps ?? 10000, water: (me.goal_water_ml ?? 2500) / 1000,
  })
  const [st, save] = useSaver()
  const on = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const a = t.auto
  return (
    <form className="card form" onSubmit={(e) => {
      e.preventDefault()
      save({
        goal_kcal: parseNum(v.kcal), goal_protein: parseNum(v.protein), goal_fat: parseNum(v.fat), goal_carbs: parseNum(v.carbs),
        goal_steps: parseNum(v.steps) ?? 10000, goal_water_ml: Math.round((parseNum(v.water) ?? 2.5) * 1000),
      })
    }}>
      <h2 className="card-title">Нормы на день</h2>
      {a ? (
        <p className="hint" style={{ margin: 0 }}>
          Расчёт: расход около <span className="num">{fmt(a.tdee)}</span> ккал, {a.cutting ? 'дефицит 15% для снижения жира' : 'поддержка, цель по жиру достигнута'}.
          Рекомендую <span className="num">{fmt(a.kcal)}</span> ккал, Б <span className="num">{a.protein}</span> · Ж <span className="num">{a.fat}</span> · У <span className="num">{a.carbs}</span> г.
          Оставь поля пустыми, чтобы использовать расчёт.
        </p>
      ) : (
        <p className="hint" style={{ margin: 0 }}>Запиши вес (и лучше % жира), чтобы приложение посчитало норму.</p>
      )}
      <div className="fields4">
        {[['kcal', 'Ккал'], ['protein', 'Белки'], ['fat', 'Жиры'], ['carbs', 'Углев.']].map(([k, l]) => (
          <label className="field" key={k}><span>{l}</span>
            <input id={`goal-${k}`} className="input" inputMode="numeric" value={v[k]} onChange={on(k)} placeholder={a ? String(a[k]) : ''} />
          </label>
        ))}
      </div>
      <div className="fields2">
        <label className="field"><span>Шаги</span>
          <input id="goal-steps" className="input" inputMode="numeric" value={v.steps} onChange={on('steps')} />
        </label>
        <label className="field"><span>Вода, л</span>
          <input id="goal-water" className="input" inputMode="decimal" value={v.water} onChange={on('water')} />
        </label>
      </div>
      {st.error && <div className="error">{st.error}</div>}
      <button className="btn" disabled={st.busy}>{st.msg || 'Сохранить нормы'}</button>
    </form>
  )
}

function PairCard() {
  const { me, partner, reloadProfile } = useApp()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  async function link(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.rpc('link_partner', { code })
    setBusy(false)
    if (error) setError(error.message)
    else reloadProfile()
  }
  async function unlink() {
    setBusy(true)
    await supabase.rpc('unlink_partner')
    setBusy(false); setConfirm(false)
    reloadProfile()
  }
  async function copy() {
    try { await navigator.clipboard.writeText(me.invite_code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* код виден на экране */ }
  }

  if (partner) {
    return (
      <section className="card">
        <h2 className="card-title">Пара</h2>
        <p style={{ margin: 0 }}>Вы связаны с <strong>{partner.name || 'партнёром'}</strong>. Переключатель вверху экранов показывает его данные.</p>
        {!confirm ? (
          <button className="btn danger small" onClick={() => setConfirm(true)}>Отвязать</button>
        ) : (
          <div className="btn-row">
            <button className="btn secondary small" onClick={() => setConfirm(false)}>Отмена</button>
            <button className="btn small" style={{ background: 'var(--bad)' }} onClick={unlink} disabled={busy}>Да, отвязать</button>
          </div>
        )}
      </section>
    )
  }
  return (
    <form className="card form" onSubmit={link}>
      <h2 className="card-title">Пара</h2>
      <div className="row" style={{ padding: 0 }}>
        <div className="row-main">
          <div className="sub">Твой код приглашения</div>
          <div className="big" style={{ fontSize: 28, letterSpacing: '0.12em', userSelect: 'all' }}>{me.invite_code}</div>
        </div>
        <button type="button" className="btn secondary small" onClick={copy}>{copied ? 'Скопировано' : 'Копировать'}</button>
      </div>
      <p className="hint" style={{ margin: 0 }}>Отправь код партнёру, или введи его код ниже.</p>
      <div className="fields2">
        <input id="pair-code" className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Код партнёра" maxLength={6} autoCapitalize="characters" />
        <button className="btn" disabled={busy || code.length < 6}>Связать</button>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  )
}

function PrivacyCard() {
  const { me } = useApp()
  const [st, save] = useSaver()
  const items = [
    ['share_finance', 'Финансы'],
    ['share_meds', 'Лекарства'],
    ['share_photos', 'Фото тела'],
  ]
  return (
    <section className="card">
      <h2 className="card-title">Что видит партнёр</h2>
      <p className="hint" style={{ margin: 0 }}>Питание, тело, шаги, тренировки и задачи партнёр видит всегда. Эти разделы скрыты, пока ты их не включишь.</p>
      {items.map(([k, l]) => (
        <label className="switch-row" key={k}><span>{l}</span>
          <input id={k} type="checkbox" className="switch" checked={!!me[k]} disabled={st.busy} onChange={(e) => save({ [k]: e.target.checked })} />
        </label>
      ))}
      {st.error && <div className="error">{st.error}</div>}
    </section>
  )
}

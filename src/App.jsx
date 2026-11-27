import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Icon, Sheet } from './ui'
import Auth from './screens/Auth'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import Food from './screens/Food'
import Body from './screens/Body'
import Plan from './screens/Plan'
import More from './screens/More'
import { QuickBody, QuickSteps, QuickWater } from './screens/Quick'
import { FoodForm } from './screens/Food'
import { today } from './lib/dates'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const TABS = [
  { id: 'today', label: 'Сегодня', icon: 'today' },
  { id: 'food', label: 'Питание', icon: 'food' },
  { id: 'add' },
  { id: 'body', label: 'Тело', icon: 'body' },
  { id: 'plan', label: 'План', icon: 'plan' },
  { id: 'more', label: 'Ещё', icon: 'more' },
]
const TITLES = { today: 'Сегодня', food: 'Питание', body: 'Тело', plan: 'План', more: 'Ещё' }

export default function App() {
  const [session, setSession] = useState(undefined)
  const [me, setMe] = useState(undefined)
  const [partner, setPartner] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!session) return
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    if (error) { setMe({ error: error.message }); return }
    setMe(data)
    if (data?.partner_id) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.partner_id).maybeSingle()
      setPartner(p)
    } else setPartner(null)
  }, [session])

  useEffect(() => {
    if (session) loadProfile()
    else { setMe(undefined); setPartner(null) }
  }, [session, loadProfile])

  if (session === undefined) return null
  if (!session) return <Auth />
  if (me === undefined) return null
  if (me?.error) return <SetupError message={me.error} />
  if (me === null) return <Onboarding userId={session.user.id} onDone={loadProfile} />
  return <Shell me={me} partner={partner} reloadProfile={loadProfile} />
}

function SetupError({ message }) {
  return (
    <div className="auth">
      <h1>My<span>Life</span></h1>
      <p>Не получилось прочитать профиль из базы. Скорее всего, в Supabase ещё не запущен файл supabase/schema.sql.</p>
      <p className="error">{message}</p>
      <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Выйти</button>
    </div>
  )
}

function Shell({ me, partner, reloadProfile }) {
  const [tab, setTab] = useState('today')
  const [who, setWho] = useState('me')
  const [date, setDate] = useState(today())
  const [version, setVersion] = useState(0)
  const [quick, setQuick] = useState(null)
  const bump = () => setVersion((v) => v + 1)

  const viewing = who === 'partner' && partner ? partner : me
  const readOnly = viewing.id !== me.id

  useEffect(() => { if (!partner) setWho('me') }, [partner])

  // Переход на новый день, если приложение висело открытым
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') bump() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const ctx = { me, partner, viewing, readOnly, date, setDate, version, bump, reloadProfile, openQuick: setQuick, goTab: setTab }
  const Screen = { today: Today, food: Food, body: Body, plan: Plan, more: More }[tab]
  const showWho = partner && tab !== 'more'

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <div className="topbar-row">
            <h1 className="title">{TITLES[tab]}</h1>
          </div>
          {showWho && (
            <div className="segmented" role="group" aria-label="Чьи данные показать">
              <button aria-pressed={who === 'me'} onClick={() => setWho('me')}>Я</button>
              <button aria-pressed={who === 'partner'} onClick={() => setWho('partner')}>{partner.name || 'Партнёр'}</button>
            </div>
          )}
        </header>
        <main className="main">
          {readOnly && tab !== 'more' && <div className="viewing-banner">Ты смотришь данные: {viewing.name || 'партнёр'}. Только просмотр.</div>}
          <Screen key={`${tab}-${viewing.id}`} />
        </main>
        <nav className="tabbar" aria-label="Разделы">
          {TABS.map((t) =>
            t.id === 'add' ? (
              <button key="add" className="tab tab-add" onClick={() => setQuick('menu')} aria-label="Добавить запись">
                <span className="plus"><Icon name="plus" /></span>
              </button>
            ) : (
              <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                <Icon name={t.icon} />
                {t.label}
              </button>
            )
          )}
        </nav>
        {quick && <QuickSheet kind={quick} setKind={setQuick} />}
      </div>
    </Ctx.Provider>
  )
}

function QuickSheet({ kind, setKind }) {
  const { bump, date } = useApp()
  const close = () => setKind(null)
  const done = () => { bump(); close() }
  if (kind === 'menu') {
    const items = [
      { id: 'food', label: 'Еда', icon: 'food' },
      { id: 'body', label: 'Вес и % жира', icon: 'scale' },
      { id: 'steps', label: 'Шаги', icon: 'steps' },
      { id: 'water', label: 'Вода', icon: 'water' },
    ]
    return (
      <Sheet title="Добавить" onClose={close}>
        <div className="choices">
          {items.map((i) => (
            <button key={i.id} className="choice" onClick={() => setKind(i.id)}>
              <Icon name={i.icon} />
              <strong>{i.label}</strong>
            </button>
          ))}
        </div>
        <p className="hint">Тренировки, лекарства, финансы и задачи появятся в следующих этапах.</p>
      </Sheet>
    )
  }
  const title = { food: 'Еда', body: 'Вес и % жира', steps: 'Шаги', water: 'Вода' }[kind]
  return (
    <Sheet title={title} onClose={close}>
      {kind === 'food' && <FoodForm date={date} onSaved={done} />}
      {kind === 'body' && <QuickBody onSaved={done} />}
      {kind === 'steps' && <QuickSteps date={date} onSaved={done} />}
      {kind === 'water' && <QuickWater date={date} onSaved={done} />}
    </Sheet>
  )
}

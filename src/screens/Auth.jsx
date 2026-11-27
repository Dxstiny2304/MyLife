import { useState } from 'react'
import { supabase } from '../supabase'

const RU_ERRORS = {
  'Invalid login credentials': 'Неверная почта или пароль.',
  'User already registered': 'Такая почта уже зарегистрирована. Войди.',
  'Email not confirmed': 'Почта не подтверждена. Открой письмо от Supabase и нажми ссылку.',
}

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(''); setInfo('')
    const creds = { email: email.trim(), password }
    const { data, error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword(creds)
      : await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: window.location.href.split('#')[0] } })
    setBusy(false)
    if (error) { setError(RU_ERRORS[error.message] || error.message); return }
    if (mode === 'signup' && !data.session) setInfo('Мы отправили письмо. Подтверди почту по ссылке и потом войди.')
  }

  return (
    <form className="auth" onSubmit={submit}>
      <div>
        <h1>My<span>Life</span></h1>
        <p style={{ marginTop: 8 }}>Питание, тело, тренировки и дела. Вдвоём.</p>
      </div>
      <div className="segmented" role="group">
        <button type="button" aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>Вход</button>
        <button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>Регистрация</button>
      </div>
      <div className="form">
        <label className="field"><span>Почта</span>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Пароль</span>
          <input id="password" className="input" type="password" minLength={6} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        {info && <div className="hint">{info}</div>}
        <button className="btn" disabled={busy}>{mode === 'signin' ? 'Войти' : 'Создать аккаунт'}</button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { useApp } from '../App'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../supabase'
import { useLoad } from '../lib/data'

const ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/sync_steps`

function Copy({ label, value }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* текст виден и выделяется */ }
  }
  return (
    <div className="copy-row">
      <div className="row-main">
        <div className="sub">{label}</div>
        <code className="code">{value}</code>
      </div>
      <button type="button" className="btn secondary small" onClick={copy}>{done ? 'Скопировано' : 'Копировать'}</button>
    </div>
  )
}

export default function HealthSync() {
  const { me } = useApp()
  const [ver, setVer] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const { data, error: loadError } = useLoad(async () => {
    const { data, error } = await supabase.from('sync_tokens').select('*').eq('user_id', me.id).maybeSingle()
    if (error) throw error
    return data
  }, [me.id, ver])

  async function regen() {
    setBusy(true); setError('')
    const { error } = await supabase.rpc('regen_sync_token')
    setBusy(false); setConfirm(false)
    if (error) setError(error.message)
    else setVer((v) => v + 1)
  }

  const last = data?.last_sync_at ? new Date(data.last_sync_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <section className="card" aria-label="Здоровье">
      <div className="card-head">
        <h2 className="card-title">Шаги из «Здоровья»</h2>
        {data && <span className={`pill ${last ? 'good' : 'warn'}`}>{last ? `обновлено ${last}` : 'ещё не было'}</span>}
      </div>
      <p className="hint" style={{ margin: 0 }}>
        Сайт не может сам читать «Здоровье», поэтому шаги отправляет команда в приложении «Команды» по расписанию.
        Настраивается один раз, минут за пять.
      </p>
      {loadError && <div className="error">Нет таблицы для синхронизации. Запусти в Supabase файл supabase/health-sync.sql.</div>}
      {!loadError && !data && <button className="btn" onClick={regen} disabled={busy}>Получить личный ключ</button>}
      {data && (
        <>
          <Copy label="Адрес (URL)" value={ENDPOINT} />
          <Copy label="Ключ Supabase (заголовок apikey)" value={SUPABASE_KEY} />
          <Copy label="Твой личный ключ (поле token)" value={data.token} />
          <details className="guide">
            <summary>Как настроить команду</summary>
            <ol>
              <li>Открой «Команды» → «+». Назови команду «MyLife шаги».</li>
              <li>Добавь действие <b>«Найти образцы Здоровья»</b>: тип «Шаги», дата начала «Сегодня», группировка «По дням».</li>
              <li>Добавь <b>«Рассчитать статистику»</b>: «Сумма» от образцов Здоровья.</li>
              <li>Добавь <b>«Текущая дата»</b>, затем <b>«Форматировать дату»</b>: формат «Особый», строка <code>yyyy-MM-dd</code>.</li>
              <li>
                Добавь <b>«Получить содержимое URL»</b>, вставь адрес. Разверни параметры:
                метод <b>POST</b>; заголовки <code>apikey</code> = ключ Supabase и <code>Content-Type</code> = <code>application/json</code>;
                тело запроса <b>JSON</b> с тремя полями: <code>token</code> (текст) = личный ключ, <code>day</code> (текст) = «Форматированная дата», <code>steps</code> (число) = «Статистика».
              </li>
              <li>Нажми ▶︎. Если ответ <code>"ok"</code>, всё работает. При первом запуске разреши доступ к «Здоровью».</li>
              <li>
                Вкладка «Автоматизация» → «+» → «Время суток»: например 23:55, ежедневно, «Запускать сразу».
                Действие: «Запустить команду» → «MyLife шаги». Сделай ещё одну-две на 13:00 и 19:00, чтобы днём цифра тоже обновлялась.
              </li>
            </ol>
            <p className="hint">Если шаги получаются вдвое больше, чем в «Здоровье», проверь, что в шаге 2 стоит группировка «По дням».</p>
          </details>
          {!confirm ? (
            <button className="btn danger small" onClick={() => setConfirm(true)}>Заменить ключ</button>
          ) : (
            <div className="btn-row">
              <button className="btn secondary small" onClick={() => setConfirm(false)}>Отмена</button>
              <button className="btn small" onClick={regen} disabled={busy}>Заменить, старый перестанет работать</button>
            </div>
          )}
        </>
      )}
      {error && <div className="error">{error}</div>}
    </section>
  )
}

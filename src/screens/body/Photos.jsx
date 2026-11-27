import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../App'
import { supabase } from '../../supabase'
import { useLoad, bodyPhotos } from '../../lib/data'
import { shortDate, today } from '../../lib/dates'
import { Icon } from '../../ui'

const POSES = [
  { id: 'front', label: 'Спереди' },
  { id: 'side', label: 'Сбоку' },
  { id: 'back', label: 'Сзади' },
]

// Уменьшаем фото до 1440 px по длинной стороне, JPEG
async function shrink(file) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 1440 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.84))
}

export default function Photos() {
  const { me, viewing, version, bump, readOnly } = useApp()
  const { data, error } = useLoad(() => bodyPhotos(viewing.id), [viewing.id, version])
  const photos = data || []
  const [urls, setUrls] = useState({})
  const [pose, setPose] = useState('front')
  const [date, setDate] = useState(today())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const paths = photos.map((p) => p.path).filter((p) => !urls[p])
    if (!paths.length) return
    supabase.storage.from('body-photos').createSignedUrls(paths, 3600).then(({ data }) => {
      if (!data) return
      setUrls((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])) }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos])

  async function upload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setErr('')
    try {
      const blob = await shrink(file)
      const path = `${me.id}/${date}-${pose}-${crypto.randomUUID().slice(0, 8)}.jpg`
      const up = await supabase.storage.from('body-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const ins = await supabase.from('body_photos').insert({ date, pose, path })
      if (ins.error) throw ins.error
      bump()
    } catch (ex) { setErr(ex.message || String(ex)) }
    setBusy(false)
  }

  async function remove(p) {
    await supabase.storage.from('body-photos').remove([p.path])
    await supabase.from('body_photos').delete().eq('id', p.id)
    setOpen(null); bump()
  }

  const byPose = photos.filter((p) => p.pose === pose)
  const first = byPose[byPose.length - 1], last = byPose[0]
  const byDate = useMemo(() => {
    const m = new Map()
    for (const p of photos) { if (!m.has(p.date)) m.set(p.date, []); m.get(p.date).push(p) }
    return [...m]
  }, [photos])

  if (error) return <section className="card"><div className="error">Фото пока не настроены в базе. Запусти в Supabase файл supabase/body-v2.sql.</div></section>
  if (readOnly && photos.length === 0) return <section className="card"><div className="empty">{viewing.share_photos ? 'Фото пока нет.' : `${viewing.name || 'Партнёр'} не открыл(а) фото для просмотра.`}</div></section>

  return (
    <>
      <div className="seg-small" role="group" aria-label="Ракурс">
        {POSES.map((p) => <button key={p.id} aria-pressed={pose === p.id} onClick={() => setPose(p.id)}>{p.label}</button>)}
      </div>

      {first && last && first.id !== last.id && (
        <section className="card" aria-label="Сравнение">
          <h2 className="card-title">Было и стало</h2>
          <div className="compare">
            {[first, last].map((p) => (
              <figure key={p.id}>
                {urls[p.path] ? <img src={urls[p.path]} alt={`Фото ${shortDate(p.date)}`} /> : <div className="ph" />}
                <figcaption className="sub">{shortDate(p.date)}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {!readOnly && (
        <section className="card" aria-label="Добавить фото">
          <h2 className="card-title">Новое фото</h2>
          <div className="fields2">
            <input id="ph-date" className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            <label className={`btn${busy ? ' disabled' : ''}`} style={{ textAlign: 'center' }}>
              {busy ? 'Загружаю…' : `Фото: ${POSES.find((p) => p.id === pose).label.toLowerCase()}`}
              <input type="file" accept="image/*" onChange={upload} disabled={busy} hidden />
            </label>
          </div>
          <p className="hint" style={{ margin: 0 }}>Снимай в одном месте и при одном свете, утром. Так разница заметнее. {me.share_photos ? 'Партнёр видит твои фото.' : 'Партнёр твои фото не видит. Это меняется в «Ещё».'}</p>
          {err && <div className="error">{err}</div>}
        </section>
      )}

      <section className="card" aria-label="Все фото">
        <h2 className="card-title">Все фото</h2>
        {byDate.length === 0 && <div className="empty">Фото пока нет.</div>}
        {byDate.map(([d, list]) => (
          <div key={d} className="photo-day">
            <div className="sub">{shortDate(d)}</div>
            <div className="thumbs">
              {list.map((p) => (
                <button key={p.id} className="thumb" onClick={() => setOpen(p)} aria-label={`Открыть фото ${shortDate(d)}`}>
                  {urls[p.path] ? <img src={urls[p.path]} alt="" /> : <div className="ph" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {open && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label="Фото">
          <img src={urls[open.path]} alt={`Фото ${shortDate(open.date)}`} />
          <div className="viewer-bar">
            <span>{shortDate(open.date)} · {POSES.find((p) => p.id === open.pose)?.label}</span>
            {!readOnly && <button className="iconbtn" onClick={() => remove(open)} aria-label="Удалить фото"><Icon name="trash" /></button>}
            <button className="iconbtn" onClick={() => setOpen(null)} aria-label="Закрыть"><Icon name="close" /></button>
          </div>
        </div>
      )}
    </>
  )
}

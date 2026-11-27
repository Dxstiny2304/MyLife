import { useState } from 'react'
import Progress from './body/Progress'
import Training from './body/Training'
import Load from './body/Load'
import Photos from './body/Photos'

const SECTIONS = [
  { id: 'progress', label: 'Прогресс', C: Progress },
  { id: 'training', label: 'Тренировки', C: Training },
  { id: 'load', label: 'Нагрузка', C: Load },
  { id: 'photos', label: 'Фото', C: Photos },
]

const read = () => { try { return localStorage.getItem('body-section') || 'progress' } catch { return 'progress' } }

export default function Body() {
  const [sec, setSec] = useState(read)
  const choose = (id) => { setSec(id); try { localStorage.setItem('body-section', id) } catch { /* не важно */ } }
  const C = (SECTIONS.find((s) => s.id === sec) || SECTIONS[0]).C
  return (
    <>
      <div className="folders" role="tablist" aria-label="Разделы тела">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={sec === s.id} onClick={() => choose(s.id)}>{s.label}</button>
        ))}
      </div>
      <C />
    </>
  )
}

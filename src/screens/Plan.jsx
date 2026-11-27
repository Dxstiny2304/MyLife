import { useApp } from '../App'

export default function Plan() {
  const { goTab } = useApp()
  return (
    <>
      <section className="card">
        <h2 className="card-title">Скоро</h2>
        <p style={{ margin: 0 }}>Здесь будут задачи: на сегодня, скоро, сделано. Это следующий этап.</p>
      </section>
      <section className="card">
        <h2 className="card-title">Тренировки</h2>
        <p style={{ margin: 0 }}>Расписание тренировок теперь во вкладке «Тело».</p>
        <button className="btn secondary small" onClick={() => goTab('body')}>Открыть</button>
      </section>
    </>
  )
}

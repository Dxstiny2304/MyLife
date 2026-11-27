// Группы мышц и базовый каталог упражнений
export const GROUPS = [
  { id: 'chest', label: 'Грудь', zone: 'upper' },
  { id: 'back', label: 'Спина', zone: 'upper' },
  { id: 'shoulders', label: 'Плечи', zone: 'upper' },
  { id: 'biceps', label: 'Бицепс', zone: 'upper' },
  { id: 'triceps', label: 'Трицепс', zone: 'upper' },
  { id: 'forearms', label: 'Предплечья', zone: 'upper' },
  { id: 'quads', label: 'Квадрицепс', zone: 'lower' },
  { id: 'hamstrings', label: 'Бицепс бедра', zone: 'lower' },
  { id: 'glutes', label: 'Ягодицы', zone: 'lower' },
  { id: 'calves', label: 'Икры', zone: 'lower' },
  { id: 'abs', label: 'Пресс', zone: 'core' },
]
export const groupLabel = (id) => GROUPS.find((g) => g.id === id)?.label ?? id

export const EXERCISES = {
  chest: ['Жим штанги лёжа', 'Жим гантелей на наклонной', 'Разводка гантелей', 'Отжимания на брусьях', 'Сведение в кроссовере'],
  back: ['Подтягивания', 'Тяга верхнего блока', 'Тяга штанги в наклоне', 'Тяга гантели одной рукой', 'Тяга горизонтального блока'],
  shoulders: ['Жим гантелей сидя', 'Армейский жим', 'Махи гантелями в стороны', 'Тяга к лицу', 'Обратные разведения'],
  biceps: ['Подъём штанги на бицепс', 'Молотки', 'Подъём гантелей на наклонной скамье', 'Сгибания на блоке'],
  triceps: ['Разгибания на блоке', 'Французский жим', 'Жим узким хватом', 'Разгибание из-за головы'],
  forearms: ['Сгибания запястий', 'Вис на турнике'],
  quads: ['Приседания со штангой', 'Жим ногами', 'Болгарские выпады', 'Разгибания ног', 'Гакк-приседания'],
  hamstrings: ['Румынская тяга', 'Сгибания ног лёжа', 'Сгибания ног сидя'],
  glutes: ['Ягодичный мост', 'Отведение ноги в кроссовере', 'Выпады назад'],
  calves: ['Подъёмы на носки стоя', 'Подъёмы на носки сидя'],
  abs: ['Скручивания на блоке', 'Подъём ног в висе', 'Планка'],
}

// Готовые типы дня: подставляют группы мышц
export const DAY_KINDS = [
  { id: 'rest', label: 'Отдых', groups: [] },
  { id: 'upper', label: 'Верх', groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { id: 'lower', label: 'Низ', groups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
  { id: 'push', label: 'Жим', groups: ['chest', 'shoulders', 'triceps'] },
  { id: 'pull', label: 'Тяга', groups: ['back', 'biceps', 'forearms'] },
  { id: 'legs', label: 'Ноги', groups: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'full', label: 'Всё тело', groups: ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'abs'] },
  { id: 'custom', label: 'Свой', groups: [] },
]
export const kindLabel = (id) => DAY_KINDS.find((k) => k.id === id)?.label ?? 'Свой'

export const WEEKDAYS = [
  { n: 1, short: 'Пн', long: 'Понедельник' },
  { n: 2, short: 'Вт', long: 'Вторник' },
  { n: 3, short: 'Ср', long: 'Среда' },
  { n: 4, short: 'Чт', long: 'Четверг' },
  { n: 5, short: 'Пт', long: 'Пятница' },
  { n: 6, short: 'Сб', long: 'Суббота' },
  { n: 7, short: 'Вс', long: 'Воскресенье' },
]
// JS: 0 = воскресенье → 7
export const isoWeekday = (date) => { const d = date.getDay(); return d === 0 ? 7 : d }

// Оценка одноповторного максимума (формула Эпли)
export const e1rm = (weight, reps) => (weight && reps ? weight * (1 + reps / 30) : 0)
export const tonnage = (sets) => (sets || []).reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)

// Понедельник недели для даты ISO
export function weekStart(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - (isoWeekday(dt) - 1))
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

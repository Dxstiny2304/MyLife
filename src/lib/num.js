// Принимаем и «72,5», и «72.5»
export const parseNum = (v) => {
  if (v === null || v === undefined) return null
  const s = String(v).replace(',', '.').replace(/\s/g, '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export const fmt = (n, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n)
    ? '—'
    : Number(n).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })

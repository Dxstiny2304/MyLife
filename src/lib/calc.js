// Процент жира по формуле ВМС США (сантиметры)
export function navyBodyFat({ sex, height, waist, neck, hip }) {
  if (!height || !waist || !neck) return null
  let bf
  if (sex === 'f') {
    if (!hip) return null
    const v = waist + hip - neck
    if (v <= 0) return null
    bf = 495 / (1.29579 - 0.35004 * Math.log10(v) + 0.221 * Math.log10(height)) - 450
  } else {
    const v = waist - neck
    if (v <= 0) return null
    bf = 495 / (1.0324 - 0.19077 * Math.log10(v) + 0.15456 * Math.log10(height)) - 450
  }
  return bf > 2 && bf < 70 ? Math.round(bf * 10) / 10 : null
}

export const ACTIVITY = [
  { value: 1.2, label: 'Сидячий образ жизни' },
  { value: 1.375, label: '1–3 тренировки в неделю' },
  { value: 1.55, label: '3–5 тренировок в неделю' },
  { value: 1.725, label: '6–7 тренировок в неделю' },
]

// Норма калорий и БЖУ для рекомпозиции.
// Если известен % жира — формула Кэтча-МакАрдла по сухой массе, иначе Миффлин-Сан Жеор.
export function suggestTargets(profile, latest) {
  const weight = latest?.weight
  if (!weight) return null
  const bf = latest?.bf
  let bmr
  let lbm = null
  if (bf) {
    lbm = weight * (1 - bf / 100)
    bmr = 370 + 21.6 * lbm
  } else if (profile.height_cm && profile.birth_year) {
    const age = new Date().getFullYear() - profile.birth_year
    bmr = 10 * weight + 6.25 * profile.height_cm - 5 * age + (profile.sex === 'f' ? -161 : 5)
  } else {
    return null
  }
  const tdee = bmr * (profile.activity || 1.4)
  const goalBf = profile.goal_bf
  // Выше цели — умеренный дефицит 15%, иначе поддержка
  const cutting = bf && goalBf ? bf > goalBf + 0.5 : true
  const kcal = Math.round((cutting ? tdee * 0.85 : tdee) / 10) * 10
  const protein = Math.round(lbm ? lbm * 2.4 : weight * 2)
  const fat = Math.round(weight * 0.8)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, fat, carbs, tdee: Math.round(tdee), cutting }
}

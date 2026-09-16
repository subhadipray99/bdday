import { COUNTRY_MAP } from '@/lib/countries'

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const MONTH_ABBR = MONTHS.map((month) => month.slice(0, 3))
export const SOURCE_LABEL = { self: 'You', personal: 'Private', subscribed: 'Following', public: 'Public' }
export function daysInMonth(month, year = 2000) { return new Date(year, month, 0).getDate() }
export function daysUntil(month, day) {
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  let next = Date.UTC(now.getFullYear(), month - 1, day)
  if (next < today) next = Date.UTC(now.getFullYear() + 1, month - 1, day)
  return Math.round((next - today) / 86400000)
}
export function untilLabel(days) { return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days` }
export function countryName(person) { return COUNTRY_MAP[person.country_code]?.name || person.country || 'Country not shared' }
export function buildEntries(mode, publicBirthdays, followedIds, personal, profile) {
  if (mode === 'global') return publicBirthdays.map((b) => ({ ...b, name: b.display_name, source: 'public' }))
  const list = []
  if (profile?.birth_month) list.push({ id: 'me', name: (profile.display_name || 'You') + ' (you)', birth_month: profile.birth_month, birth_day: profile.birth_day, source: 'self' })
  personal.forEach((p) => list.push({ id: p.id, name: p.person_name, birth_month: p.birth_month, birth_day: p.birth_day, relationship: p.relationship, source: 'personal' }))
  publicBirthdays.filter((b) => followedIds.includes(b.id)).forEach((b) => list.push({ ...b, name: b.display_name, source: 'subscribed' }))
  return list
}
function hashCode(str) { let h = 0; for (const char of String(str || '')) { h = (h << 5) - h + char.charCodeAt(0); h |= 0 } return Math.abs(h) }
export function buildGlobePoints(birthdays, month, day) {
  return birthdays.flatMap((b) => {
    const country = COUNTRY_MAP[b.country_code]
    if (!country) return []
    const today = b.birth_month === month && b.birth_day === day
    return [{ lat: country.lat + ((hashCode(b.id) % 100) / 100 - 0.5) * 4,
      lng: country.lng + ((hashCode(b.id + 'x') % 100) / 100 - 0.5) * 4,
      today, r: today ? 0.8 : 0.35, alt: today ? 0.06 : 0.015,
      label: `${b.display_name} · ${country.name} · ${MONTH_ABBR[b.birth_month - 1]} ${b.birth_day}${today ? ' · Today' : ''}`, data: b }]
  })
}

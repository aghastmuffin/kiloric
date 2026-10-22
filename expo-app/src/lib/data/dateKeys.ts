const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map((part) => Number.parseInt(part, 10))
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday-based week start. */
export function startOfWeek(date: Date = new Date()): Date {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7
  return addDays(day, -offset)
}

export function weekDayKeys(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, index) => dayKey(addDays(weekStart, index)))
}

export function lastNDayKeys(count: number, end: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => dayKey(addDays(startOfDay(end), index - count + 1)))
}

export function weekdayName(date: Date): string {
  return WEEKDAYS[date.getDay()]
}

export function weekdayInitial(date: Date): string {
  return WEEKDAYS[date.getDay()].charAt(0)
}

export function shortWeekday(date: Date): string {
  return WEEKDAYS[date.getDay()].slice(0, 3)
}

export function shortMonthDay(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function longDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function monthRangeLabel(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${LONG_MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`
  }
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`
}

export function timeLabel(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${pad(minutes)} ${suffix}`
}

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b)
}

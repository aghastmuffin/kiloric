export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function localDayBounds(date = new Date()): { start: Date; end: Date } {
  const start = startOfLocalDay(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

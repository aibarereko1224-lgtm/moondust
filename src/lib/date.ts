export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDisplayDate(value: string | null) {
  if (!value) return '日期未记'
  return value.slice(0, 10).replaceAll('-', '.')
}

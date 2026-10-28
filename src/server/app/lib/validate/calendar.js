import { addDays, addMonths, isValid, parse } from 'date-fns'

export const isRealDate = (year, month, day) => {
  const monthsInYear = 12
  if (![year, month, day].every(Number.isInteger)) {
    return false
  }
  if (month < 1 || month > monthsInYear) {
    return false
  }
  if (day < 1) {
    return false
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export const startOfUtcDay = (date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )

export const startOfDayInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const partValue = (type) =>
    Number(parts.find((part) => part.type === type).value)
  return new Date(
    Date.UTC(partValue('year'), partValue('month') - 1, partValue('day'))
  )
}

export const addUtcDays = (date, days) => addDays(startOfUtcDay(date), days)

export const addUtcMonths = (date, months) =>
  addMonths(startOfUtcDay(date), months)

export const parseDateText = (raw) => {
  const dateTextFormat = 'd/M/yyyy'
  const fourDigitYearDateText = /^\d{1,2}\/\d{1,2}\/\d{4}$/
  const text = String(raw ?? '').trim()
  if (!fourDigitYearDateText.test(text)) {
    return null
  }
  const parsed = parse(text, dateTextFormat, new Date())
  return isValid(parsed)
    ? new Date(
        Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
      )
    : null
}

export const formatDateText = (date) =>
  `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`

/**
 * Renders a `YYYY-MM-DD` calendar date as `d MMM yyyy`.
 * @param {string} [calendarDate] - The date as `YYYY-MM-DD`.
 * @returns {string} e.g. `21 Jul 2026`, or `''` when the value is not a real `YYYY-MM-DD` date.
 */
export const formatDisplayCalendarDate = (calendarDate) => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDate ?? '')
  if (!parts) {
    return ''
  }
  const [year, month, day] = parts.slice(1).map(Number)
  if (!isRealDate(year, month, day)) {
    return ''
  }
  const monthAbbreviations = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
  return `${day} ${monthAbbreviations[month - 1]} ${year}`
}

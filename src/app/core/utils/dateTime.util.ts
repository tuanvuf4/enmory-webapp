import { defaultSetting } from '@/config/appConfig'
import moment from 'moment'

function isValidDate(dateString: string) {
  if (
    (Object.prototype.toString.call(dateString) && '[object Date]') ||
    !isNaN(Date.parse(dateString))
  ) {
    return true
  }
  return false
}

function getDateFromBegin(d: number | string | Date): Date | undefined {
  if (typeof d === 'string' && !isValidDate(d)) return
  const date = new Date(d)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function getDateToEnd(d: number | string | Date): Date | undefined {
  if (typeof d === 'string' && !isValidDate(d)) return
  const date = new Date(d)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

const getRangeDate = (from: number, to: number, separator = '-') => {
  const day = 24 * 60 * 60 * 1000
  const date = new Date(from)
  const range = []
  while (from < to) {
    range.push({
      title: `${defaultSetting.shortDays[date.getDay()]} (${moment(date).format("MMM DD")})`,
      from: moment(date).startOf('day').toDate().getTime(),
      to: moment(date).endOf('day').toDate().getTime(),
    })
    date.setDate(date.getDate() + 1)
    from += day
  }
  return range
}

function getMonthName(d: Date) {
  return [
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
  ][d.getMonth()]
}

function addZeroWithCondition(n: number): string {
  return n < 10 ? '0' + n.toString() : n.toString()
}

function getTimezone(offset: number) {
  return 'GMT' + (offset < 0 ? '+' : '-') + addZeroWithCondition((Math.abs(offset) / 60) | 0)
}

function getDisplayDate(milliseconds: number, separator = '/'): string {
  const date = new Date(milliseconds).getDate()
  const month = new Date(milliseconds).getMonth() + 1
  const year = new Date(milliseconds).getFullYear()
  return (
    (date < 10 ? '0' + date.toString() : date.toString()) +
    separator +
    (month < 10 ? '0' + month.toString() : month.toString()) +
    separator +
    year
  )
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getDateFromBeginingOfMonth(
  day = 0,
  d: number | string | Date = new Date(),
): Date | undefined {
  if (typeof d === 'string' && !isValidDate(d)) return
  const date = new Date(d)
  return new Date(date.getFullYear(), date.getMonth() + day, 1, 0, 0, 0, 0)
}

function getDateToLastMonth(day = 0, d: number | string | Date = new Date()): Date | undefined {
  if (typeof d === 'string' && !isValidDate(d)) return
  const date = new Date(d)
  return new Date(
    date.getFullYear(),
    date.getMonth() + day,
    daysInMonth(date.getFullYear(), date.getMonth()),
    23,
    59,
    59,
    99,
  )
}

function getDateFromBeginYear(year = 0, d: number | string | Date = new Date()): Date | undefined {
  if (typeof d === 'string' && !isValidDate(d)) return
  const date = new Date(d)
  return new Date(date.getFullYear() + year, 0, 1, 0, 0, 0, 0)
}

function getDateToEndYear(year = 0, d: number | string | Date = new Date()): Date | undefined {
  if (typeof d === 'string' && !isValidDate(d)) return
  const date = new Date(d)
  return new Date(date.getFullYear() + year, 11, 31, 23, 59, 59, 99)
}

export const dateTimeUtils = {
  isValidDate,
  getDateFromBegin,
  getDateToEnd,
  getMonthName,
  addZeroWithCondition,
  getTimezone,
  getDisplayDate,
  daysInMonth,
  getDateFromBeginingOfMonth,
  getDateToLastMonth,
  getDateFromBeginYear,
  getDateToEndYear,
  getRangeDate,
}

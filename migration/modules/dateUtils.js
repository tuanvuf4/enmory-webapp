/**
 * Date Utility Module
 * Safe date conversion for migration
 */

/**
 * Safely convert a date to milliseconds
 * Handles null, undefined, strings, and Date objects
 * @param {*} date - Value to convert
 * @param {number} defaultValue - Default value if conversion fails (default: 0)
 * @returns {number} Milliseconds since epoch or default value
 */
export function toMilliseconds(date, defaultValue = 0) {
  if (date === null || date === undefined) {
    return defaultValue
  }

  // If it's already a number, assume it's milliseconds
  if (typeof date === 'number') {
    return date
  }

  // If it's a string, try to parse it
  if (typeof date === 'string') {
    const parsed = new Date(date)
    return isNaN(parsed.getTime()) ? defaultValue : parsed.getTime()
  }

  // If it's a Date object, get the time
  if (date instanceof Date) {
    const time = date.getTime()
    return isNaN(time) ? defaultValue : time
  }

  // If it has a getTime method, call it
  if (typeof date?.getTime === 'function') {
    try {
      const time = date.getTime()
      return isNaN(time) ? defaultValue : time
    } catch (error) {
      return defaultValue
    }
  }

  return defaultValue
}

/**
 * Safely get a date value, converting strings and objects as needed
 * @param {*} value - Value to process
 * @returns {number} Milliseconds or 0
 */
export function safeDate(value) {
  return toMilliseconds(value, 0)
}

/**
 * Convert a date to ISO string for logging
 * @param {number} milliseconds - Milliseconds since epoch
 * @returns {string} ISO date string
 */
export function toISOString(milliseconds) {
  return new Date(milliseconds).toISOString()
}

/**
 * Create a date utility object for a value
 * @param {*} value - Value to process
 * @returns {object} Object with methods for date handling
 */
export function createDateHandler(value) {
  return {
    get milliseconds() {
      return toMilliseconds(value, 0)
    },
    get isValid() {
      return toMilliseconds(value, null) !== null
    },
    get isoString() {
      return toISOString(this.milliseconds)
    },
  }
}

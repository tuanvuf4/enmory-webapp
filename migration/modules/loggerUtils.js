/**
 * Migration Logger Utility
 * Centralized logging for migrations
 */

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

export class MigrationLogger {
  constructor(name) {
    this.name = name
  }

  info(message) {
    console.log(`${COLORS.blue}ℹ️ ${this.name}:${COLORS.reset} ${message}`)
  }

  success(message) {
    console.log(`${COLORS.green}✅ ${this.name}:${COLORS.reset} ${message}`)
  }

  warning(message) {
    console.log(`${COLORS.yellow}⚠️  ${this.name}:${COLORS.reset} ${message}`)
  }

  error(message) {
    console.error(`${COLORS.red}❌ ${this.name}:${COLORS.reset} ${message}`)
  }

  progress(current, total, message = '') {
    const percent = Math.round((current / total) * 100)
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5))
    const display = `[${bar}] ${percent}% (${current}/${total})`
    if (message) {
      console.log(`${COLORS.cyan}  ${display} - ${message}${COLORS.reset}`)
    } else {
      console.log(`${COLORS.cyan}  ${display}${COLORS.reset}`)
    }
  }
}

export class MigrationStats {
  constructor() {
    this.count = 0
    this.errors = []
    this.startTime = Date.now()
  }

  addError(id, error) {
    this.errors.push({ id, error: error.message || String(error) })
  }

  increment() {
    this.count++
  }

  getDuration() {
    return ((Date.now() - this.startTime) / 1000).toFixed(2)
  }

  toJSON() {
    return {
      count: this.count,
      errors: this.errors,
      duration: this.getDuration(),
    }
  }
}

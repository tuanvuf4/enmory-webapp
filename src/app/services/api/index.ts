/**
 * API Service Exports
 * Uses Firebase backend only
 */

// Export REST API implementations for backward compatibility
// These are still used by apiFactory for fallback scenarios
export * from './app.api'
export * from './auth.api'
export * from './chart.api'
export * from './example.api'
export * from './item.api'
export * from './media.api'
export * from './user.api'

// Export Firebase-only config
export const API_CONFIG = {
  source: 'FIREBASE',
  isFirebase: true,
}

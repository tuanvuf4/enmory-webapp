/**
 * API Configuration
 *
 * This module provides Firebase-only backend configuration
 */

/**
 * API Configuration object
 */
export const API_CONFIG = {
  // Always uses Firebase
  source: 'FIREBASE' as const,

  // Check if Firebase is enabled (always true)
  isFirebaseMode(): boolean {
    return true
  },

  // Get configuration summary
  getInfo() {
    return {
      source: this.source,
      isFirebase: true,
      timestamp: new Date().toISOString(),
    }
  },

  // Log configuration to console
  log(): void {
    console.log(`%c[API Configuration]`, 'color: #4CAF50; font-weight: bold;')
    console.log(`%c✓ Backend: 🔥 FIREBASE`, 'color: #1976D2;')
    console.log(`%c✓ Source: FIREBASE`, 'color: #1976D2;')
    console.log('%c✓ Firebase Firestore enabled', 'color: #FF6F00;')
    console.log('%c⚠ Make sure Firebase credentials are configured in .env', 'color: #FF9800;')
  },
}

/**
 * API Implementation Strategy
 *
 * All APIs now use Firebase implementation
 */
export const API_STRATEGY = {
  // Authentication API
  auth: {
    useFirebase: true,
    source: 'FIREBASE' as const,
    supportsFirebase: true,
  },

  // Item/Learning Data API
  item: {
    useFirebase: true,
    source: 'FIREBASE' as const,
    supportsFirebase: true,
  },

  // User Profile API
  user: {
    useFirebase: true,
    source: 'FIREBASE' as const,
    supportsFirebase: true,
  },

  // Example sentences API
  example: {
    useFirebase: true,
    source: 'FIREBASE' as const,
    supportsFirebase: true,
  },

  // Chart/Statistics API
  chart: {
    useFirebase: true,
    source: 'FIREBASE' as const,
    supportsFirebase: true,
  },
}

/**
 * Logging configuration
 */
export const enableApiLogging = (): void => {
  API_CONFIG.log()
}

/**
 * Get current API implementation strategy
 */
export const getApiStrategy = () => API_STRATEGY

/**
 * Check if specific API uses Firebase (always true now)
 */
export const isApiFirebase = (): boolean => {
  return API_CONFIG.isFirebaseMode()
}

/**
 * Get API source for specific API (always Firebase)
 */
export const getApiSourceFor = (): string => {
  return API_CONFIG.source
}

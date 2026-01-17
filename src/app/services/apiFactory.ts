/**
 * API Factory
 * Uses Firebase Firestore backend
 */

/**
 * Determine if using Firebase as API source (always true)
 */
export const isFirebaseMode = (): boolean => true

/**
 * Get current API source name
 */
export const getApiSource = (): string => 'FIREBASE'

/**
 * Get API configuration info
 */
export const getApiInfo = () => ({
  source: 'FIREBASE',
  isFirebase: true,
  mode: 'FIREBASE',
  timestamp: new Date().toISOString(),
})

/**
 * Log API configuration on application start
 */
export const logApiConfiguration = (): void => {
  console.log(`%c[API Configuration] Using 🔥 FIREBASE`, 'color: #4CAF50; font-weight: bold;')
  console.log(`%c[API Source] FIREBASE`, 'color: #2196F3; font-weight: bold;')
  console.log('%c[Firebase] Firestore backend enabled', 'color: #FF6F00; font-weight: bold;')
}

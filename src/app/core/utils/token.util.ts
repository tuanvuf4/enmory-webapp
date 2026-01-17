/**
 * Token utility functions
 */

export const isTokenExpired = (expiredIn: number): boolean => {
  if (expiredIn === -1) return true
  // expired_in is typically the number of seconds until expiration
  return expiredIn <= 0
}

export const shouldRefreshToken = (expiredIn: number): boolean => {
  if (expiredIn === -1) return false
  // Refresh token if it expires within the next 5 minutes (300 seconds)
  return expiredIn <= 300
}

export const getTokenExpirationTime = (expiredIn: number): number => {
  if (expiredIn === -1) return 0
  // Return the expiration time as timestamp
  return Date.now() + expiredIn * 1000
}

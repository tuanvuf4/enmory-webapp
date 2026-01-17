/**
 * API Factory
 *
 * This module provides a factory pattern using Firebase implementations
 */

import { API_CONFIG } from '@/config/apiConfig'
import { itemApi as itemApiFirebase } from '@/services/firebase/api/item.api.firebase'
import { apiAuth } from './auth.api'
import { apiUser as userApiFirebase } from '@/services/firebase/api/user.api.firebase'
import { exampleApiFirebase } from '@/services/firebase/api/example.api.firebase'
import { chartApi } from './chart.api'
import { mediaApi } from './media.api'
import { appApiFirebase } from '@/services/firebase/api/app.api.firebase'

/**
 * API Factory
 *
 * All API calls use Firebase Firestore backend
 *
 * Usage:
 * const items = await apiFactory.item.getItems(params)
 * const user = await apiFactory.user.getUserInfo()
 * const auth = await apiFactory.auth.signInWithGoogle()
 */
export const apiFactory = {
  /**
   * Auth API - Uses Firebase for authentication
   */
  auth: apiAuth,

  /**
   * Item API - Uses Firebase Firestore
   */
  item: itemApiFirebase,

  /**
   * User API - Uses Firebase Firestore
   */
  user: userApiFirebase,

  /**
   * App API (Categories, Types, IOTD) - Uses Firebase
   */
  app: appApiFirebase,

  /**
   * Example API - Uses Firebase
   */
  example: exampleApiFirebase,

  /**
   * Chart API - Uses Firebase
   */
  chart: chartApi,

  /**
   * Media API - Uses Firebase
   */
  media: mediaApi,

  /**
   * Get current API source
   */
  getSource: () => API_CONFIG.source,

  /**
   * Check if using Firebase (always true)
   */
  isFirebaseMode: () => API_CONFIG.isFirebaseMode(),
}

export default apiFactory

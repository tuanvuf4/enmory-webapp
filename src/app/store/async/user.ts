import { createAsyncThunk } from '@reduxjs/toolkit'
import { authAction } from '../reducers/auth.reducer'

/**
 * Logout action
 * Clears auth state in Redux
 */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  return authAction.logOut()
})

export const actionAsyncUser = {
  // User info is now managed through Firebase auth state
  // All authentication actions use Firebase directly
}

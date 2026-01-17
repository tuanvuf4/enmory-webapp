/**
 * Redux Auth Slice
 * Manages authentication state in Redux store
 */

import { firebaseAuthService, IAuthUser, IUserProfile } from '@/services/firebase'
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface AuthState {
  user: IAuthUser | null
  userProfile: IUserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export const initialState: AuthState = {
  user: null,
  userProfile: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
}

// Async thunks
export const registerWithEmail = createAsyncThunk(
  'auth/registerWithEmail',
  async (
    {
      email,
      password,
      userData,
    }: { email: string; password: string; userData?: Partial<IUserProfile> },
    { rejectWithValue },
  ) => {
    try {
      const result = await firebaseAuthService.registerWithEmail(email, password, userData)
      const authUser = firebaseAuthService.getCurrentAuthUser()
      const userProfile = await firebaseAuthService.getUserProfile(result.user.uid)

      return {
        user: authUser,
        userProfile,
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to register with email')
    }
  },
)

export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await firebaseAuthService.signInWithEmail(email, password)
      const authUser = firebaseAuthService.getCurrentAuthUser()
      const userProfile = await firebaseAuthService.getUserProfile(result.user.uid)

      return {
        user: authUser,
        userProfile,
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign in with email')
    }
  },
)

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const result = await firebaseAuthService.signInWithGoogle()
      const authUser = firebaseAuthService.getCurrentAuthUser()
      const userProfile = await firebaseAuthService.getUserProfile(result.user.uid)

      return {
        user: authUser,
        userProfile,
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign in with Google')
    }
  },
)

export const signOutUser = createAsyncThunk('auth/signOut', async (_, { rejectWithValue }) => {
  try {
    await firebaseAuthService.signOut()
    return null
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to sign out')
  }
})

export const checkAuthState = createAsyncThunk('auth/checkAuthState', async (_, {}) => {
  try {
    const authUser = firebaseAuthService.getCurrentAuthUser()
    let userProfile = null

    if (authUser) {
      userProfile = await firebaseAuthService.getUserProfile(authUser.uid)
    }

    return {
      user: authUser,
      userProfile,
    }
  } catch (error) {
    return {
      user: null,
      userProfile: null,
    }
  }
})

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async ({ uid, data }: { uid: string; data: Partial<IUserProfile> }, { rejectWithValue }) => {
    try {
      await firebaseAuthService.updateUserProfile(uid, data)
      const updatedProfile = await firebaseAuthService.getUserProfile(uid)
      return updatedProfile
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update user profile')
    }
  },
)

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    resetAuth: (state) => {
      state.user = null
      state.userProfile = null
      state.isAuthenticated = false
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Register with Email
    builder
      .addCase(registerWithEmail.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerWithEmail.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.userProfile = action.payload.userProfile
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(registerWithEmail.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.error = action.payload as string
      })

    // Sign in with Email
    builder
      .addCase(signInWithEmail.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.userProfile = action.payload.userProfile
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.error = action.payload as string
      })

    // Sign in with Google
    builder
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.userProfile = action.payload.userProfile
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.error = action.payload as string
      })

    // Sign out
    builder
      .addCase(signOutUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(signOutUser.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.userProfile = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(signOutUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Check auth state
    builder
      .addCase(checkAuthState.pending, (state) => {
        state.isLoading = true
      })
      .addCase(checkAuthState.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.userProfile = action.payload.userProfile
        state.isAuthenticated = !!action.payload.user
      })
      .addCase(checkAuthState.rejected, (state) => {
        state.isLoading = false
        state.isAuthenticated = false
      })

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.userProfile = action.payload
        state.error = null
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError, resetAuth } = authSlice.actions
export default authSlice.reducer

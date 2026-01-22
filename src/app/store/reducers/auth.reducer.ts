/**
 * Redux Auth Slice
 * Manages authentication state in Redux store using Firebase
 */

import { firebaseAuthService, IUserProfile } from '@/services/firebase'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export interface IAuthState {
  // Firebase user (combined auth info and profile)
  user: IUserProfile | null
  // Loading state for async operations
  isLoading: boolean
  // Legacy auth flag (for backward compatibility)
  isAuth: boolean
  // Error message
  error: string | null
}

export const initialState: IAuthState = {
  user: null,
  isLoading: false,
  isAuth: false,
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
      const userProfile = await firebaseAuthService.getUserProfile(result.user.uid)

      return userProfile
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
      const userProfile = await firebaseAuthService.getUserProfile(result.user.uid)

      return userProfile
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
      const userProfile = await firebaseAuthService.getUserProfile(result.user.uid)

      return userProfile
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

    if (authUser) {
      const userProfile = await firebaseAuthService.getUserProfile(authUser.uid)
      return userProfile
    }

    return null
  } catch (error) {
    return null
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
export const authReducer = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    logOut: (state) => {
      state.user = null
      state.isAuth = false
      state.error = null
      state.isLoading = false
    },
    updateUserConfig: (state, action) => {
      console.log(`*** action *** `, action)
      if (state.user) {
        state.user.configuration = action.payload
      }
    },
    setGoogleAuth: (state, action) => {
      state.isAuth = true
      // Store Firebase user info
      if (action.payload && action.payload.email) {
        state.user = action.payload
      }
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
        state.user = action.payload
        state.isAuth = true
        state.error = null
      })
      .addCase(registerWithEmail.rejected, (state, action) => {
        state.isLoading = false
        state.isAuth = false
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
        state.user = action.payload
        state.isAuth = true
        state.error = null
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.isLoading = false
        state.isAuth = false
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
        state.user = action.payload
        state.isAuth = true
        state.error = null
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false
        state.isAuth = false
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
        state.isAuth = false
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
        state.user = action.payload
        state.isAuth = !!action.payload
      })
      .addCase(checkAuthState.rejected, (state) => {
        state.isLoading = false
        state.isAuth = false
      })

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.error = null
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const authAction = authReducer.actions
export const { clearError, logOut, updateUserConfig, setGoogleAuth } = authReducer.actions
export default authReducer.reducer

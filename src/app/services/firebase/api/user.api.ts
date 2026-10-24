import { IHttpResponse } from '@/models/http.model'
import { IUser, IUserConfig } from '@/models/user.model'
import { db } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { collection, getDocs, doc, updateDoc, Timestamp, query } from 'firebase/firestore'
import { appSetting } from '@/config/appConfig'
import { removeUndefinedFields } from '@/services/firebase/dbIntegration'

/**
 * Get all users (requires admin privileges)
 */
const getUsers = async (): Promise<IHttpResponse<IUser[]>> => {
  try {
    const usersQuery = query(collection(db, 'users'))
    const snapshot = await getDocs(usersQuery)

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as IUser[]

    return {
      isSuccess: true,
      message: 'Users fetched successfully',
      content: users,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

/**
 * Create a new user (handled in auth.api, but kept for compatibility)
 */
const createUser = async (item: IUser): Promise<IHttpResponse<IUser>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const userDocRef = doc(db, 'users', currentUser.uid)
    const rawConfig = (item.configuration || {}) as Record<string, any>
    const cleanConfig = Object.fromEntries(
      Object.entries(rawConfig).filter(([_, v]) => v !== undefined),
    )
    const sanitizedConfig = {
      ...appSetting.meta,
      ...cleanConfig,
      numberOfListeningSentences:
        rawConfig.numberOfListeningSentences ?? appSetting.meta.numberOfListeningSentences,
    }

    const userData: Partial<IUser> = removeUndefinedFields({
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      photoURL: item.photoURL,
      createdAt: Timestamp.now().toMillis(),
      updatedAt: Timestamp.now().toMillis(),
      configuration: sanitizedConfig,
    })

    await updateDoc(userDocRef, userData)

    return {
      isSuccess: true,
      message: 'User created successfully',
      content: {
        uid: currentUser.uid as any,
        ...userData,
      } as IUser,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

/**
 * Update user configuration
 */
const userConfig = async (
  item: IUserConfig<string>,
): Promise<IHttpResponse<IUserConfig<string>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const userDocRef = doc(db, 'users', currentUser.uid)
    const cleanConfig = Object.fromEntries(
      Object.entries(item || {}).filter(([_, v]) => v !== undefined),
    )
    const sanitizedConfig = {
      ...appSetting.meta,
      ...cleanConfig,
      numberOfListeningSentences:
        item?.numberOfListeningSentences ?? appSetting.meta.numberOfListeningSentences,
    }

    const configData = removeUndefinedFields({
      configuration: sanitizedConfig,
      last_update: Timestamp.now().toMillis(),
    })

    await updateDoc(userDocRef, configData)

    return {
      isSuccess: true,
      message: 'User configuration updated successfully',
      content: sanitizedConfig as unknown as IUserConfig<string>,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating user config:', error)
    throw error
  }
}

/**
 * Update user configuration with proper type conversion
 */
const updateUserConfig = async (
  config: IUserConfig<number[]>,
): Promise<IHttpResponse<IUserConfig<number[]>>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const userDocRef = doc(db, 'users', currentUser.uid)
    const cleanConfig = Object.fromEntries(
      Object.entries(config || {}).filter(([_, v]) => v !== undefined),
    )
    const sanitizedConfig: IUserConfig<number[]> = {
      ...appSetting.meta,
      ...cleanConfig,
      numberOfListeningSentences:
        config?.numberOfListeningSentences ?? appSetting.meta.numberOfListeningSentences,
    }

    const updateData = removeUndefinedFields({
      configuration: sanitizedConfig,
      updatedAt: Timestamp.now().toMillis(),
    })

    await updateDoc(userDocRef, updateData)

    return {
      isSuccess: true,
      message: 'User configuration updated successfully',
      content: sanitizedConfig,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating user configuration:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Failed to update user configuration',
      content: null as any,
      statusCode: 500,
    }
  }
}

export const apiUser = {
  getUsers,
  createUser,
  userConfig,
  updateUserConfig,
}

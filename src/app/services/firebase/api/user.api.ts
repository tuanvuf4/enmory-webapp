import { IHttpResponse } from '@/models/http.model'
import { IUser, IUserConfig } from '@/models/user.model'
import { db } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import { collection, getDocs, doc, updateDoc, Timestamp, query } from 'firebase/firestore'

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
    const userData: Partial<IUser> = {
      username: item.username,
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      sex: item.sex,
      avatar: item.avatar,
      phoneNumber: item.phoneNumber,
      status: true,
      is_active: true,
      created_date: Timestamp.now().toMillis(),
      last_active: Timestamp.now().toMillis(),
      configuration: item.configuration,
    }

    await updateDoc(userDocRef, userData)

    return {
      isSuccess: true,
      message: 'User created successfully',
      content: {
        id: currentUser.uid as any,
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
    const configData = {
      configuration: item,
      last_update: Timestamp.now().toMillis(),
    }

    await updateDoc(userDocRef, configData)

    return {
      isSuccess: true,
      message: 'User configuration updated successfully',
      content: item,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating user config:', error)
    throw error
  }
}

export const apiUser = {
  getUsers,
  createUser,
  userConfig,
}

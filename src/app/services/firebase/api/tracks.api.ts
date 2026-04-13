/**
 * Tracks API Service
 * Provides Firebase operations for managing audio/video tracks in the tracks collection
 *
 * Features:
 * - Get all tracks with pagination and filtering
 * - Get a single track by ID
 * - Add a new track
 * - Update an existing track
 * - Soft delete a track (mark as deleted)
 * - Hard delete a track (permanent deletion)
 * - Get count of user's tracks
 *
 * All operations are user-scoped and require authentication
 */

import { ITracks } from '@/models/media.model'
import { db, dbCollections } from '@/config/firebaseConfig'
import { firebaseAuthService } from '@/services/firebase/authService'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  QueryConstraint,
  orderBy,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
  getCountFromServer,
} from 'firebase/firestore'

interface ITracksResponse<T> {
  isSuccess: boolean
  message: string
  content: T | null
  statusCode: number
  lastDoc?: QueryDocumentSnapshot<DocumentData>
  hasMore?: boolean
}

export interface ITracksRequestParams {
  keyword?: string
  page: number
  size: number
  orderBy?: 'created_date' | 'title'
  order?: 'ASC' | 'DESC'
}

/**
 * Helper function to build Firestore query constraints for tracks
 */
const buildQueryConstraints = (params: ITracksRequestParams): QueryConstraint[] => {
  const constraints: QueryConstraint[] = []
  const currentUser = firebaseAuthService.getCurrentUser()

  // Filter by current user
  if (currentUser) {
    constraints.push(where('uid', '==', currentUser.uid))
  }

  // Search by keyword (title or description)
  if (params.keyword && params.keyword.trim()) {
    const keyword = params.keyword.toLowerCase()
    constraints.push(where('title_lowercase', '>=', keyword))
    constraints.push(where('title_lowercase', '<=', keyword + '\uf8ff'))
  }

  // Sorting
  const sortField = params.orderBy === 'title' ? 'title' : 'created_date'
  const sortOrder = params.order === 'ASC' ? 'asc' : 'desc'
  constraints.push(orderBy(sortField, sortOrder))

  // Pagination
  constraints.push(limit(params.size))

  return constraints
}

/**
 * Get all tracks with pagination and filtering
 */
const getTracks = async (params: ITracksRequestParams): Promise<ITracksResponse<ITracks[]>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const constraints = buildQueryConstraints(params)
    const tracksQuery = query(collection(db, dbCollections.tracks), ...constraints)

    const snapshot = await getDocs(tracksQuery)
    const tracks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as ITracks[]

    // Get last document for pagination
    const lastDoc = snapshot.docs[snapshot.docs.length - 1]

    return {
      isSuccess: true,
      message: 'Tracks fetched successfully',
      content: tracks,
      statusCode: 200,
      lastDoc,
      hasMore: tracks.length === params.size,
    }
  } catch (error) {
    console.error('Error fetching tracks:', error)
    throw error
  }
}

/**
 * Get a single track by ID
 */
const getTrackById = async (trackId: string): Promise<ITracksResponse<ITracks>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const trackRef = doc(db, dbCollections.tracks, trackId)
    const trackSnap = await getDoc(trackRef)

    if (!trackSnap.exists()) {
      throw new Error('Track not found')
    }

    const trackData = trackSnap.data() as unknown as ITracks & { uid: string }
    const track: ITracks = {
      ...trackData,
      id: trackSnap.id as unknown as number,
    }

    // Verify ownership
    if (trackData.uid !== currentUser.uid) {
      throw new Error('Unauthorized access to track')
    }

    return {
      isSuccess: true,
      message: 'Track fetched successfully',
      content: track,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error fetching track by ID:', error)
    throw error
  }
}

/**
 * Add a new track
 */
const addTrack = async (
  trackData: Omit<ITracks, 'id' | 'created_date' | 'last_update'>,
): Promise<ITracksResponse<ITracks>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Prepare track data
    const newTrack = {
      ...trackData,
      uid: currentUser.uid,
      created_date: Timestamp.now().toMillis(),
      last_update: Timestamp.now().toMillis(),
      is_deleted: 0,
      title_lowercase: (trackData.title || '').toLowerCase(), // For case-insensitive search
    }

    // Add to Firestore
    const docRef = await addDoc(collection(db, dbCollections.tracks), newTrack)

    const createdTrack: ITracks = {
      ...trackData,
      id: docRef.id as unknown as number,
      created_date: newTrack.created_date,
      last_update: newTrack.last_update,
      is_deleted: newTrack.is_deleted,
    }

    return {
      isSuccess: true,
      message: 'Track created successfully',
      content: createdTrack,
      statusCode: 201,
    }
  } catch (error) {
    console.error('Error adding track:', error)
    throw error
  }
}

/**
 * Update a track
 */
const updateTrack = async (
  trackId: string,
  updateData: Partial<ITracks>,
): Promise<ITracksResponse<ITracks>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const trackRef = doc(db, dbCollections.tracks, trackId)
    const trackSnap = await getDoc(trackRef)

    if (!trackSnap.exists()) {
      throw new Error('Track not found')
    }

    const existingTrack = trackSnap.data() as unknown as ITracks & { uid: string }

    // Verify ownership
    if (existingTrack.uid !== currentUser.uid) {
      throw new Error('Unauthorized access to track')
    }

    // Prepare update data
    const dataToUpdate: any = {
      ...updateData,
      last_update: Timestamp.now().toMillis(),
    }

    if (updateData.title) {
      dataToUpdate.title_lowercase = updateData.title.toLowerCase()
    }

    await updateDoc(trackRef, dataToUpdate)

    // Return updated track
    const updatedTrackSnap = await getDoc(trackRef)
    const updatedTrackData = updatedTrackSnap.data() as unknown as ITracks
    const updatedTrack: ITracks = {
      ...updatedTrackData,
      id: updatedTrackSnap.id as unknown as number,
    }

    return {
      isSuccess: true,
      message: 'Track updated successfully',
      content: updatedTrack,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error updating track:', error)
    throw error
  }
}

/**
 * Delete a track (soft delete - mark as deleted)
 */
const removeTrack = async (trackId: string): Promise<ITracksResponse<null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const trackRef = doc(db, dbCollections.tracks, trackId)
    const trackSnap = await getDoc(trackRef)

    if (!trackSnap.exists()) {
      throw new Error('Track not found')
    }

    const trackData = trackSnap.data() as unknown as ITracks & { uid: string }

    // Verify ownership
    if (trackData.uid !== currentUser.uid) {
      throw new Error('Unauthorized access to track')
    }

    // Soft delete
    await updateDoc(trackRef, {
      is_deleted: 1,
      last_update: Timestamp.now().toMillis(),
    })

    return {
      isSuccess: true,
      message: 'Track deleted successfully',
      content: null,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error deleting track:', error)
    throw error
  }
}

/**
 * Hard delete a track (permanent deletion)
 */
const hardDeleteTrack = async (trackId: string): Promise<ITracksResponse<null>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const trackRef = doc(db, dbCollections.tracks, trackId)
    const trackSnap = await getDoc(trackRef)

    if (!trackSnap.exists()) {
      throw new Error('Track not found')
    }

    const trackData = trackSnap.data() as unknown as ITracks & { uid: string }

    // Verify ownership
    if (trackData.uid !== currentUser.uid) {
      throw new Error('Unauthorized access to track')
    }

    // Hard delete
    await deleteDoc(trackRef)

    return {
      isSuccess: true,
      message: 'Track permanently deleted successfully',
      content: null,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error hard deleting track:', error)
    throw error
  }
}

/**
 * Get count of all user tracks
 */
const getTracksCount = async (): Promise<ITracksResponse<number>> => {
  try {
    const currentUser = firebaseAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const tracksQuery = query(
      collection(db, dbCollections.tracks),
      where('uid', '==', currentUser.uid),
    )
    const snapshot = await getCountFromServer(tracksQuery)

    return {
      isSuccess: true,
      message: 'Tracks count fetched successfully',
      content: snapshot.data().count,
      statusCode: 200,
    }
  } catch (error) {
    console.error('Error getting tracks count:', error)
    throw error
  }
}

export const tracksApi = {
  getTracks,
  getTrackById,
  addTrack,
  updateTrack,
  removeTrack,
  hardDeleteTrack,
  getTracksCount,
}

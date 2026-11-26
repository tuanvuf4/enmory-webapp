import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { requireAuth } from '@/services/firebase/authService'
import { IToeicAttempt, IToeicExam } from '@/models/toeic.model'

/**
 * Recursively strip undefined properties so Firestore never fails on undefined fields.
 */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        result[k] = stripUndefined(v)
      }
    }
    return result as T
  }
  return obj
}

/**
 * Verify whether the currently authenticated user has admin role in Firestore users collection.
 */
async function verifyAdminRole(uid: string): Promise<boolean> {
  try {
    const userSnap = await getDoc(doc(db, dbCollections.users, uid))
    if (!userSnap.exists()) return false
    const data = userSnap.data()
    return data?.configuration?.role === 'admin'
  } catch {
    return false
  }
}

const isLocalTempId = (id?: string) =>
  !id || id.startsWith('toeic_') || id.startsWith('sample_') || id.startsWith('attempt_')

export const toeicApi = {
  /**
   * Fetch all shared (non-deleted) TOEIC exams from Firestore.
   * Available to all users.
   */
  async getExams(): Promise<IToeicExam[]> {
    const snapshot = await getDocs(collection(db, dbCollections.toeicExams))
    const exams: IToeicExam[] = []
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as IToeicExam
      if (!data.is_deleted) {
        exams.push({
          ...data,
          id: docSnap.id,
        })
      }
    })
    return exams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  },

  /**
   * Fetch all TOEIC exam docs including soft-deleted ones (used by sync to remove deleted exams locally).
   */
  async getAllExamsForSync(): Promise<IToeicExam[]> {
    const snapshot = await getDocs(collection(db, dbCollections.toeicExams))
    return snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as IToeicExam),
      id: docSnap.id,
    }))
  },

  /**
   * Save or create a shared TOEIC exam on Firestore using Firestore's auto-generated ID.
   * Only admin users are allowed to create/modify shared exams.
   */
  async saveExam(exam: IToeicExam): Promise<IToeicExam> {
    const { user, error } = requireAuth()
    if (error || !user) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.')
    }

    const isAdmin = await verifyAdminRole(user.uid)
    if (!isAdmin) {
      throw new Error('Chỉ tài khoản Admin mới có quyền tạo hoặc chỉnh sửa đề thi.')
    }

    const now = Date.now()
    const { id: existingId, ...rest } = exam
    const payloadWithoutId = stripUndefined({
      ...rest,
      uid: exam.uid || user.uid,
      createdAt: exam.createdAt || now,
      updatedAt: now,
      is_deleted: false,
    })

    if (!isLocalTempId(existingId)) {
      const existingRef = doc(db, dbCollections.toeicExams, existingId)
      await setDoc(existingRef, payloadWithoutId, { merge: true })
      return { ...payloadWithoutId, id: existingId }
    }

    const docRef = await addDoc(collection(db, dbCollections.toeicExams), payloadWithoutId)
    return { ...payloadWithoutId, id: docRef.id }
  },

  /**
   * Soft-delete a shared TOEIC exam on Firestore (Admin only).
   */
  async deleteExam(examId: string): Promise<void> {
    const { user, error } = requireAuth()
    if (error || !user) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.')
    }

    const isAdmin = await verifyAdminRole(user.uid)
    if (!isAdmin) {
      throw new Error('Chỉ tài khoản Admin mới có quyền xóa đề thi.')
    }

    await setDoc(
      doc(db, dbCollections.toeicExams, examId),
      { is_deleted: true, updatedAt: Date.now() },
      { merge: true },
    )
  },

  /**
   * Fetch TOEIC attempt history for the current user (or specified uid).
   */
  async getUserAttempts(targetUid?: string): Promise<IToeicAttempt[]> {
    const { user } = requireAuth()
    const uid = targetUid || user?.uid
    if (!uid) return []

    const q = query(collection(db, dbCollections.toeicAttempts), where('uid', '==', uid))
    const snapshot = await getDocs(q)
    const attempts: IToeicAttempt[] = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as IToeicAttempt),
      id: docSnap.id,
    }))
    return attempts.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))
  },

  /**
   * Save a user's TOEIC exam attempt to Firestore using Firestore's auto-generated ID.
   */
  async saveAttempt(attempt: IToeicAttempt): Promise<IToeicAttempt> {
    const { user, error } = requireAuth()
    if (error || !user) {
      throw new Error('Bạn cần đăng nhập để lưu lịch sử làm bài lên server.')
    }

    const { id: existingId, ...rest } = attempt
    const payloadWithoutId = stripUndefined({
      ...rest,
      uid: user.uid,
    })

    if (!isLocalTempId(existingId)) {
      const existingRef = doc(db, dbCollections.toeicAttempts, existingId)
      await setDoc(existingRef, payloadWithoutId, { merge: true })
      return { ...payloadWithoutId, id: existingId }
    }

    const docRef = await addDoc(collection(db, dbCollections.toeicAttempts), payloadWithoutId)
    return { ...payloadWithoutId, id: docRef.id }
  },

  /**
   * Delete a user's own TOEIC attempt from Firestore.
   */
  async deleteAttempt(attemptId: string): Promise<void> {
    const { user, error } = requireAuth()
    if (error || !user) {
      throw new Error('Bạn cần đăng nhập để xóa lịch sử.')
    }

    const ref = doc(db, dbCollections.toeicAttempts, attemptId)
    const snap = await getDoc(ref)
    if (snap.exists() && snap.data()?.uid === user.uid) {
      await deleteDoc(ref)
    }
  },
}

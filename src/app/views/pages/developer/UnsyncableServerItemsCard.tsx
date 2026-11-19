import React, { useState, useMemo, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Input,
  Select,
  Alert,
  Tooltip,
  message,
  Tabs,
  Row,
  Col,
  Checkbox,
  theme,
  Divider,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  ExclamationCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  CopyOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  CloudSyncOutlined,
  CloudUploadOutlined,
  WarningOutlined,
  CodeOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { useSelector, itemKeys, checklistKeys } from '@/core/hooks'
import {
  syncService,
  localDb,
  invalidateSearchIndex,
  normalizeItemForLocalDb,
} from '@/services/localDb'
import { IItem } from '@/models/item.model'
import { categories } from '@/constant/item'
import { getCategory } from '@/helpers/item'
import { ECategory } from '@/models/item.model'
import moment from 'moment'
import { useQueryClient } from '@tanstack/react-query'

const { Text, Paragraph } = Typography

export interface IUnsyncableServerItem {
  id: string
  origin: string
  reason: string
  reasonDetails?: string
  catId?: number
  level?: number
  uid?: string
  tags?: string[]
  tags_lowercase?: string[]
  meanings?: any[]
  created_date?: number
  last_update?: number
  rawData?: any
  source: 'sync-cache' | 'firestore-scan' | 'local-db-only'
}

export const UnsyncableServerItemsCard: React.FC = () => {
  const { token } = theme.useToken()
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  // State
  const [items, setItems] = useState<IUnsyncableServerItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [onlyCurrentUser, setOnlyCurrentUser] = useState<boolean>(true)
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'local-only' | 'server-only' | 'schema-error'
  >('all')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [serverStats, setServerStats] = useState<{
    totalServer: number
    activeServer: number
    localCount: number
  } | null>(null)

  // Computed counts for filters & quick badges
  const localOnlyCount = useMemo(() => {
    return items.filter(
      (it) =>
        it.source === 'local-db-only' ||
        it.reason.includes('thiếu trên Server') ||
        it.reason.includes('chưa có trên Firestore') ||
        it.reason.includes('chưa sync lên Cloud'),
    ).length
  }, [items])

  const missingInLocalCount = useMemo(() => {
    return items.filter(
      (it) =>
        it.reason.includes('thiếu trong Local DB') ||
        it.reason.includes('chưa được sync vào Local Database'),
    ).length
  }, [items])

  const schemaErrorCount = useMemo(() => {
    return items.filter(
      (it) =>
        it.source !== 'local-db-only' &&
        !it.reason.includes('thiếu trên Server') &&
        !it.reason.includes('chưa có trên Firestore') &&
        !it.reason.includes('chưa sync lên Cloud') &&
        !it.reason.includes('thiếu trong Local DB') &&
        !it.reason.includes('chưa được sync vào Local Database'),
    ).length
  }, [items])

  // View Modal State
  const [viewingItem, setViewingItem] = useState<IUnsyncableServerItem | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false)

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<IUnsyncableServerItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [editTab, setEditTab] = useState<'form' | 'json'>('form')
  const [editOrigin, setEditOrigin] = useState<string>('')
  const [editCatId, setEditCatId] = useState<number>(1)
  const [editLevel, setEditLevel] = useState<number>(1)
  const [editUid, setEditUid] = useState<string>('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editDefinition, setEditDefinition] = useState<string>('')
  const [editTranslation, setEditTranslation] = useState<string>('')
  const [editJsonText, setEditJsonText] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [hasScanned, setHasScanned] = useState<boolean>(false)

  // Load unsynced items from syncMeta cache manually (without scanning Firestore)
  const loadCachedUnsyncedRecords = useCallback(async () => {
    if (!user?.uid) return
    try {
      const cached = await syncService.getLastUnsyncedRecords(user.uid)
      const cachedItems: IUnsyncableServerItem[] = cached
        .filter((r) => r.type === 'item')
        .map((r) => ({
          id: r.id,
          origin: r.title || '(Không có origin)',
          reason: r.reason,
          reasonDetails: r.errorDetails,
          last_update: r.updatedAt,
          rawData: (r as any).rawData || { id: r.id, origin: r.title },
          source: 'sync-cache' as const,
        }))

      if (cachedItems.length > 0) {
        setItems((prev) => {
          const map = new Map<string, IUnsyncableServerItem>()
          cachedItems.forEach((it) => map.set(it.id, it))
          prev.forEach((it) => map.set(it.id, it))
          return Array.from(map.values())
        })
        setHasScanned(true)
        message.info(`Đã tải ${cachedItems.length} item lỗi từ bộ nhớ cache gần nhất.`)
      } else {
        message.info('Không có item lỗi nào trong bộ nhớ cache.')
      }
    } catch (err) {
      console.warn('Failed to load cached unsynced records:', err)
    }
  }, [user?.uid])

  // Full Firestore Scan for Unsyncable Items
  const handleScanServer = useCallback(async () => {
    if (!user) {
      message.error('Vui lòng đăng nhập để quét Firebase Firestore.')
      return
    }

    setLoading(true)
    try {
      const foundItems: IUnsyncableServerItem[] = []
      const foundIds = new Set<string>()

      // 1. Pull cached unsynced records first
      const cachedUnsynced = await syncService.getLastUnsyncedRecords(user.uid)
      for (const rec of cachedUnsynced) {
        if (rec.type === 'item') {
          foundIds.add(rec.id)
          let rawData: any = (rec as any).rawData || null
          if (rec.id && rec.id !== 'unknown') {
            try {
              const docSnap = await getDoc(doc(db, dbCollections.items, rec.id))
              if (docSnap.exists()) {
                rawData = { ...docSnap.data(), id: docSnap.id }
              }
            } catch {}
          }
          foundItems.push({
            id: rec.id,
            origin: rec.title || rawData?.origin || '(Không có origin)',
            reason: rec.reason,
            reasonDetails: rec.errorDetails,
            catId: rawData?.catId,
            level: rawData?.level,
            uid: rawData?.uid || user.uid,
            tags: rawData?.tags || [],
            tags_lowercase: rawData?.tags_lowercase,
            meanings: rawData?.meanings || [],
            created_date: rawData?.created_date,
            last_update: rec.updatedAt || rawData?.last_update,
            rawData: rawData || { id: rec.id, origin: rec.title },
            source: 'sync-cache',
          })
        }
      }

      // 2. Query Firestore directly
      const itemsRef = collection(db, dbCollections.items)
      let q = query(itemsRef)
      if (onlyCurrentUser && user?.uid) {
        q = query(itemsRef, where('uid', '==', user.uid))
      }
      const snapshot = await getDocs(q)

      // Preload local items for fast lookup
      const localItemsList =
        onlyCurrentUser && user?.uid
          ? await localDb.items.where('uid').equals(user.uid).toArray()
          : await localDb.items.toArray()
      const localIds = new Set(localItemsList.map((it) => it.id))
      const localCount = localItemsList.length

      let activeServerCount = 0
      const serverDocMap = new Map<string, any>()

      snapshot.forEach((docSnap) => {
        const id = docSnap.id
        const data = docSnap.data() || {}
        serverDocMap.set(id, data)
        activeServerCount++

        const reasons: string[] = []

        // Check 1: Document ID
        if (!id || !id.trim()) {
          reasons.push('Thiếu Document ID')
        }

        // Check 2: Origin
        if (!data.origin || typeof data.origin !== 'string' || !data.origin.trim()) {
          reasons.push('Origin rỗng hoặc không phải chuỗi ký tự')
        }

        // Check 3: UID
        if (!data.uid || typeof data.uid !== 'string' || !data.uid.trim()) {
          reasons.push('Thiếu UID người dùng')
        }

        // Check 4: tags_lowercase format (IndexedDB multi-entry index violation)
        if (data.tags_lowercase !== undefined && data.tags_lowercase !== null) {
          if (!Array.isArray(data.tags_lowercase)) {
            reasons.push('tags_lowercase không phải mảng (gây lỗi IndexedDB index)')
          } else if (data.tags_lowercase.some((t: any) => typeof t !== 'string' || t === null)) {
            reasons.push('tags_lowercase chứa giá trị null hoặc không phải chuỗi')
          }
        }

        // Check 5: tags format
        if (data.tags !== undefined && data.tags !== null && !Array.isArray(data.tags)) {
          reasons.push('tags không phải dạng mảng')
        }

        // Check 6: meanings format
        if (
          data.meanings !== undefined &&
          data.meanings !== null &&
          !Array.isArray(data.meanings)
        ) {
          reasons.push('meanings không phải dạng mảng')
        }

        // Check 7: Active in Firestore but missing in local IndexedDB (always active)
        if (!localIds.has(id)) {
          reasons.push('Có trên Server nhưng thiếu trong Local DB')
        }

        // Check 8: Missing or invalid last_update timestamp
        if (!data.last_update || typeof data.last_update !== 'number' || data.last_update <= 0) {
          reasons.push('Thiếu trường last_update hợp lệ (khiến Delta Sync có thể bỏ qua)')
        }

        if (reasons.length > 0) {
          const itemObj: IUnsyncableServerItem = {
            id,
            origin: data.origin || '(Không có origin)',
            reason: reasons.join('; '),
            catId: data.catId,
            level: data.level,
            uid: data.uid,
            tags: data.tags || [],
            tags_lowercase: data.tags_lowercase,
            meanings: data.meanings || [],
            created_date: data.created_date,
            last_update: data.last_update,
            rawData: { ...data, id },
            source: 'firestore-scan',
          }

          if (foundIds.has(id)) {
            const idx = foundItems.findIndex((it) => it.id === id)
            if (idx !== -1) {
              foundItems[idx] = itemObj
            }
          } else {
            foundIds.add(id)
            foundItems.push(itemObj)
          }
        }
      })

      // Check local DB items that are missing or unsynced on Firestore (always active)
      for (const localItem of localItemsList) {
        const id = localItem.id
        if (!id) {
          // Local item without ID
          foundItems.push({
            id: 'local-no-id-' + Math.random().toString(36).substring(2, 8),
            origin: localItem.origin || '(Không có origin)',
            reason: 'Item trong Local DB bị thiếu ID (không thể đồng bộ lên Firestore)',
            catId: localItem.catId,
            level: localItem.level,
            uid: localItem.uid || user.uid,
            tags: localItem.tags || [],
            tags_lowercase: localItem.tags_lowercase,
            meanings: localItem.meanings || [],
            created_date: localItem.created_date,
            last_update: localItem.last_update,
            rawData: localItem,
            source: 'local-db-only',
          })
          continue
        }

        const serverDoc = serverDocMap.get(id)
        if (!serverDoc) {
          // Document does NOT exist in Firestore at all (Local only)
          if (!foundIds.has(id)) {
            foundIds.add(id)
            foundItems.push({
              id,
              origin: localItem.origin || '(Không có origin)',
              reason: 'Có trong Local DB nhưng thiếu trên Server (chưa sync lên Cloud)',
              catId: localItem.catId,
              level: localItem.level,
              uid: localItem.uid || user.uid,
              tags: localItem.tags || [],
              tags_lowercase: localItem.tags_lowercase,
              meanings: localItem.meanings || [],
              created_date: localItem.created_date,
              last_update: localItem.last_update,
              rawData: localItem,
              source: 'local-db-only',
            })
          }
        }
      }

      setServerStats({
        totalServer: snapshot.size,
        activeServer: activeServerCount,
        localCount,
      })

      setItems(foundItems)
      if (foundItems.length === 0) {
        message.success('Tuyệt vời! Không phát hiện item nào bị lỗi đồng bộ trên Server.')
      } else {
        const localUnsynced = foundItems.filter(
          (it) =>
            it.source === 'local-db-only' ||
            it.reason.includes('thiếu trên Server') ||
            it.reason.includes('chưa có trên Firestore') ||
            it.reason.includes('chưa sync lên Cloud'),
        ).length
        if (localUnsynced > 0) {
          message.warning(
            `Tìm thấy ${foundItems.length} item cần xử lý (trong đó có ${localUnsynced} item trong Local DB chưa sync lên Server).`,
          )
        } else {
          message.warning(
            `Đã tìm thấy ${foundItems.length} item có lỗi không thể đồng bộ trên Server.`,
          )
        }
        setHasScanned(true)
      }
    } catch (err: any) {
      console.error('Scan Firestore failed:', err)
      message.error(`Lỗi khi quét Firestore: ${err?.message || err}`)
    } finally {
      setLoading(false)
    }
  }, [user, onlyCurrentUser])

  // Filter items based on search keyword and category filter
  const filteredItems = useMemo(() => {
    let result = items
    if (categoryFilter === 'local-only') {
      result = result.filter(
        (it) =>
          it.source === 'local-db-only' ||
          it.reason.includes('thiếu trên Server') ||
          it.reason.includes('chưa có trên Firestore') ||
          it.reason.includes('chưa sync lên Cloud'),
      )
    } else if (categoryFilter === 'server-only') {
      result = result.filter(
        (it) =>
          it.reason.includes('thiếu trong Local DB') ||
          it.reason.includes('chưa được sync vào Local Database'),
      )
    } else if (categoryFilter === 'schema-error') {
      result = result.filter(
        (it) =>
          it.source !== 'local-db-only' &&
          !it.reason.includes('thiếu trên Server') &&
          !it.reason.includes('chưa có trên Firestore') &&
          !it.reason.includes('chưa sync lên Cloud') &&
          !it.reason.includes('thiếu trong Local DB') &&
          !it.reason.includes('chưa được sync vào Local Database'),
      )
    }

    if (!searchKeyword.trim()) return result
    const kw = searchKeyword.toLowerCase()
    return result.filter(
      (it) =>
        it.origin?.toLowerCase().includes(kw) ||
        it.id?.toLowerCase().includes(kw) ||
        it.reason?.toLowerCase().includes(kw) ||
        it.uid?.toLowerCase().includes(kw),
    )
  }, [items, categoryFilter, searchKeyword])

  // Open View Modal
  const handleOpenView = (record: IUnsyncableServerItem) => {
    setViewingItem(record)
    setIsViewModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (record: IUnsyncableServerItem) => {
    setEditingItem(record)
    const raw = record.rawData || {}
    setEditOrigin(record.origin === '(Không có origin)' ? '' : record.origin || raw.origin || '')
    setEditCatId(record.catId ?? raw.catId ?? 1)
    setEditLevel(record.level ?? raw.level ?? 1)
    setEditUid(record.uid || raw.uid || user?.uid || '')
    setEditTags(Array.isArray(record.tags) ? record.tags : Array.isArray(raw.tags) ? raw.tags : [])

    const firstMeaning = Array.isArray(raw.meanings) && raw.meanings[0] ? raw.meanings[0] : null
    setEditDefinition(firstMeaning?.definition || '')
    setEditTranslation(firstMeaning?.translation || '')

    const fullDoc = {
      ...raw,
      id: record.id,
      origin: record.origin === '(Không có origin)' ? '' : record.origin || raw.origin || '',
      uid: record.uid || raw.uid || user?.uid || '',
    }
    setEditJsonText(JSON.stringify(fullDoc, null, 2))
    setEditTab('form')
    setIsEditModalOpen(true)
  }

  // Save Edits to Firestore & Local DB
  const handleSaveEdit = async () => {
    if (!editingItem) return
    setIsSaving(true)

    try {
      let finalDoc: any

      if (editTab === 'json') {
        try {
          finalDoc = JSON.parse(editJsonText)
        } catch (jsonErr: any) {
          message.error(`JSON không hợp lệ: ${jsonErr.message}`)
          setIsSaving(false)
          return
        }
      } else {
        if (!editOrigin.trim()) {
          message.error('Origin (Từ/Cụm từ) không được để trống!')
          setIsSaving(false)
          return
        }

        const normalizedTags = editTags.map((t) => String(t).trim()).filter(Boolean)
        const normalizedTagsLower = normalizedTags.map((t) =>
          t.replace(/^#+/, '').trim().toLowerCase(),
        )

        const raw = editingItem.rawData || {}
        const existingMeanings = Array.isArray(raw.meanings) ? [...raw.meanings] : []
        if (existingMeanings.length === 0) {
          existingMeanings.push({
            id: `m_${Date.now()}`,
            definition: editDefinition.trim(),
            translation: editTranslation.trim(),
            typeId: 0,
            examples: [],
          })
        } else {
          existingMeanings[0] = {
            ...existingMeanings[0],
            definition: editDefinition.trim(),
            translation: editTranslation.trim(),
          }
        }

        finalDoc = {
          ...raw,
          id: editingItem.id,
          origin: editOrigin.trim(),
          catId: editCatId,
          level: editLevel,
          uid: editUid.trim() || user?.uid,
          tags: normalizedTags,
          tags_lowercase: normalizedTagsLower,
          meanings: existingMeanings,
          last_update: Date.now(),
        }
      }

      const itemId = editingItem.id
      if (!itemId || itemId === 'unknown') {
        message.error('Item không có ID hợp lệ để lưu vào Firestore!')
        setIsSaving(false)
        return
      }

      // 1. Update Firestore
      const docRef = doc(db, dbCollections.items, itemId)
      const { id: _ignoreId, ...firestorePayload } = finalDoc
      await setDoc(docRef, firestorePayload, { merge: true })

      // 2. Put into Local Database
      const localItem = {
        ...finalDoc,
        id: itemId,
        uid: finalDoc.uid || user?.uid,
      }
      delete localItem.quiz
      await localDb.items.put(localItem)
      invalidateSearchIndex()

      // 3. Remove from unsynced records cache
      if (user?.uid) {
        await syncService.removeUnsyncedRecord(user.uid, itemId)
      }

      // 4. Invalidate React Queries
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

      // 5. Update local state
      setItems((prev) => prev.filter((it) => it.id !== itemId))
      setSelectedRowKeys((prev) => prev.filter((k) => k !== itemId))

      message.success(`Đã cập nhật và đồng bộ item "${finalDoc.origin}" thành công!`)
      setIsEditModalOpen(false)
      setEditingItem(null)
    } catch (err: any) {
      console.error('Save item failed:', err)
      message.error(`Lỗi khi lưu item: ${err?.message || err}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete single item from Firestore & Local DB
  const handleDeleteItem = (record: IUnsyncableServerItem) => {
    const isLocalOnly = record.source === 'local-db-only'
    Modal.confirm({
      title: isLocalOnly
        ? 'Xóa item khỏi Local Database?'
        : 'Xóa vĩnh viễn item khỏi Firebase Firestore?',
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: (
        <div>
          <Paragraph>
            {isLocalOnly ? (
              <span>
                Bạn có chắc chắn muốn xóa item này khỏi <b>Local Database</b>?
              </span>
            ) : (
              <span>
                Bạn có chắc chắn muốn xóa vĩnh viễn item này khỏi cả <b>Firebase Firestore</b> và{' '}
                <b>Local Database</b>?
              </span>
            )}
          </Paragraph>
          <div
            style={{
              padding: 10,
              backgroundColor: token.colorBgContainerDisabled || '#2a2a2a',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <div>
              <b>Origin:</b> {record.origin}
            </div>
            <div>
              <b>ID:</b> <code>{record.id}</code>
            </div>
            <div>
              <b>Lý do / Tình trạng:</b>{' '}
              <span style={{ color: token.colorError }}>{record.reason}</span>
            </div>
          </div>
        </div>
      ),
      okText: 'Xóa vĩnh viễn',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        const hideLoading = message.loading(`Đang xóa item ${record.id}...`, 0)
        try {
          // Delete from Firestore if id is valid and not local-only
          if (
            !isLocalOnly &&
            record.id &&
            record.id !== 'unknown' &&
            !record.id.startsWith('local-no-id-')
          ) {
            await deleteDoc(doc(db, dbCollections.items, record.id))

            // Record into deleted_records
            if (user?.uid) {
              const deletedRef = doc(db, dbCollections.deleted_records, `${user.uid}_${record.id}`)
              await setDoc(deletedRef, {
                uid: user.uid,
                recordId: record.id,
                origin: record.origin,
                collectionName: dbCollections.items,
                deleted_at: Timestamp.now(),
              })
            }
          }

          // Delete from localDb
          if (record.id && record.id !== 'unknown') {
            await localDb.items.delete(record.id)
          }

          // Clean up unsynced record
          if (user?.uid) {
            await syncService.removeUnsyncedRecord(user.uid, record.id)
          }

          // Invalidate
          invalidateSearchIndex()
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

          // Update state
          setItems((prev) => prev.filter((it) => it.id !== record.id))
          setSelectedRowKeys((prev) => prev.filter((k) => k !== record.id))

          // Update stats
          setServerStats((prev) =>
            prev
              ? {
                  ...prev,
                  localCount: Math.max(0, prev.localCount - 1),
                  activeServer: isLocalOnly
                    ? prev.activeServer
                    : Math.max(0, prev.activeServer - 1),
                }
              : null,
          )

          hideLoading()
          message.success(
            isLocalOnly
              ? `Đã xóa item "${record.origin}" khỏi Local Database!`
              : `Đã xóa vĩnh viễn item "${record.origin}" khỏi Server!`,
          )
        } catch (err: any) {
          hideLoading()
          console.error('Delete item failed:', err)
          message.error(`Lỗi khi xóa item: ${err?.message || err}`)
        }
      },
    })
  }

  // Push a single local item to Firestore
  const handlePushToFirestore = async (record: IUnsyncableServerItem) => {
    if (!user?.uid) {
      message.error('Vui lòng đăng nhập để đồng bộ dữ liệu.')
      return
    }

    if (!record.id || record.id === 'unknown' || record.id.startsWith('local-no-id-')) {
      message.error(
        'Item không có ID hợp lệ để lưu lên Firestore. Vui lòng bấm "Sửa item" để đặt ID.',
      )
      return
    }

    const hideLoading = message.loading(`Đang đẩy item "${record.origin}" lên Firestore...`, 0)
    try {
      const raw = record.rawData || {}
      const normalizedTags = Array.isArray(record.tags)
        ? record.tags.filter((t: any) => typeof t === 'string' && t.trim())
        : Array.isArray(raw.tags)
          ? raw.tags.filter((t: any) => typeof t === 'string' && t.trim())
          : []
      const normalizedTagsLower = normalizedTags.map((t: string) =>
        t.replace(/^#+/, '').trim().toLowerCase(),
      )

      const sanitizedDoc: any = {
        ...raw,
        id: record.id,
        origin:
          record.origin && record.origin !== '(Không có origin)'
            ? record.origin.trim()
            : (raw.origin || '').trim(),
        uid: record.uid || raw.uid || user.uid,
        catId: record.catId ?? raw.catId ?? 1,
        level: record.level ?? raw.level ?? 1,
        tags: normalizedTags,
        tags_lowercase: normalizedTagsLower,
        meanings: Array.isArray(record.meanings)
          ? record.meanings
          : Array.isArray(raw.meanings)
            ? raw.meanings
            : [],
        last_update: Date.now(),
      }
      delete sanitizedDoc.quiz

      // 1. Upload to Firestore
      const docRef = doc(db, dbCollections.items, record.id)
      const { id: _ignoreId, ...firestorePayload } = sanitizedDoc
      await setDoc(docRef, firestorePayload, { merge: true })

      // 2. Put into localDb
      await localDb.items.put(sanitizedDoc)

      // 3. Remove from unsynced records
      await syncService.removeUnsyncedRecord(user.uid, record.id)

      // 4. Invalidate React Queries & search index
      invalidateSearchIndex()
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

      // 5. Update state
      setItems((prev) => prev.filter((it) => it.id !== record.id))
      setSelectedRowKeys((prev) => prev.filter((k) => k !== record.id))

      // Update serverStats
      setServerStats((prev) =>
        prev
          ? {
              ...prev,
              totalServer: prev.totalServer + (record.source === 'local-db-only' ? 1 : 0),
              activeServer: prev.activeServer + (record.source === 'local-db-only' ? 1 : 0),
            }
          : null,
      )

      hideLoading()
      message.success(`Đã đẩy và đồng bộ item "${sanitizedDoc.origin}" lên Firestore thành công!`)
    } catch (err: any) {
      hideLoading()
      console.error('Push to Firestore failed:', err)
      message.error(`Lỗi khi đẩy lên Firestore: ${err?.message || err}`)
    }
  }

  // Batch push selected items to Firestore
  const handleBatchPushToFirestore = () => {
    const selectedItems = items.filter((it) => selectedRowKeys.includes(it.id))
    if (selectedItems.length === 0) return

    Modal.confirm({
      title: `Đẩy ${selectedItems.length} item đã chọn lên Firebase Firestore?`,
      icon: <CloudUploadOutlined style={{ color: token.colorPrimary }} />,
      content: (
        <div>
          <Paragraph>
            Thao tác này sẽ đồng bộ và lưu <b>{selectedItems.length}</b> item đã chọn lên{' '}
            <b>Firebase Firestore</b>, giúp đảm bảo dữ liệu trên Cloud và Local đồng bộ.
          </Paragraph>
        </div>
      ),
      okText: `Đẩy ${selectedItems.length} item`,
      okType: 'primary',
      cancelText: 'Hủy',
      onOk: async () => {
        const hideLoading = message.loading(
          `Đang đẩy ${selectedItems.length} items lên Firestore...`,
          0,
        )
        try {
          // Push in chunks of 400
          for (let i = 0; i < selectedItems.length; i += 400) {
            const chunk = selectedItems.slice(i, i + 400)
            const batch = writeBatch(db)

            for (const it of chunk) {
              if (it.id && it.id !== 'unknown' && !it.id.startsWith('local-no-id-')) {
                const raw = it.rawData || {}
                const normalizedTags = Array.isArray(it.tags)
                  ? it.tags.filter((t: any) => typeof t === 'string' && t.trim())
                  : Array.isArray(raw.tags)
                    ? raw.tags.filter((t: any) => typeof t === 'string' && t.trim())
                    : []
                const normalizedTagsLower = normalizedTags.map((t: string) =>
                  t.replace(/^#+/, '').trim().toLowerCase(),
                )

                const sanitizedDoc: any = {
                  ...raw,
                  id: it.id,
                  origin:
                    it.origin && it.origin !== '(Không có origin)'
                      ? it.origin.trim()
                      : (raw.origin || '').trim(),
                  uid: it.uid || raw.uid || user?.uid,
                  catId: it.catId ?? raw.catId ?? 1,
                  level: it.level ?? raw.level ?? 1,
                  tags: normalizedTags,
                  tags_lowercase: normalizedTagsLower,
                  meanings: Array.isArray(it.meanings)
                    ? it.meanings
                    : Array.isArray(raw.meanings)
                      ? raw.meanings
                      : [],
                  last_update: Date.now(),
                }
                delete sanitizedDoc.quiz
                const { id: _ignoreId, ...firestorePayload } = sanitizedDoc
                batch.set(doc(db, dbCollections.items, it.id), firestorePayload, { merge: true })
                await localDb.items.put(sanitizedDoc)
              }
            }

            await batch.commit()
          }

          if (user?.uid) {
            for (const it of selectedItems) {
              await syncService.removeUnsyncedRecord(user.uid, it.id)
            }
          }

          invalidateSearchIndex()
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

          const pushedIds = new Set(selectedItems.map((it) => it.id))
          setItems((prev) => prev.filter((it) => !pushedIds.has(it.id)))
          setSelectedRowKeys([])

          hideLoading()
          message.success(`Đã đẩy thành công ${selectedItems.length} item lên Firestore!`)
          handleScanServer()
        } catch (err: any) {
          hideLoading()
          console.error('Batch push to Firestore failed:', err)
          message.error(`Lỗi khi đẩy hàng loạt: ${err?.message || err}`)
        }
      },
    })
  }

  // Push all local items that are missing on server to Firestore
  const handlePushAllLocalToFirestore = () => {
    const localOnlyItems = items.filter(
      (it) =>
        it.source === 'local-db-only' ||
        it.reason.includes('thiếu trên Server') ||
        it.reason.includes('chưa có trên Firestore') ||
        it.reason.includes('chưa sync lên Cloud'),
    )
    if (localOnlyItems.length === 0) return

    Modal.confirm({
      title: `Đẩy tất cả ${localOnlyItems.length} item chưa sync lên Firebase Firestore?`,
      icon: <CloudUploadOutlined style={{ color: token.colorPrimary }} />,
      content: (
        <div>
          <Paragraph>
            Thao tác này sẽ đồng bộ toàn bộ <b>{localOnlyItems.length}</b> item đang có trong Local
            DB nhưng chưa có trên Server lên <b>Firebase Firestore</b>.
          </Paragraph>
          <Paragraph type='secondary'>
            Sau khi đẩy, số lượng item trên Cloud Server và Local DB sẽ khớp nhau hoàn toàn.
          </Paragraph>
        </div>
      ),
      okText: `Đẩy ${localOnlyItems.length} item lên Cloud`,
      okType: 'primary',
      cancelText: 'Hủy',
      onOk: async () => {
        const hideLoading = message.loading(
          `Đang đẩy ${localOnlyItems.length} items lên Firestore...`,
          0,
        )
        try {
          for (let i = 0; i < localOnlyItems.length; i += 400) {
            const chunk = localOnlyItems.slice(i, i + 400)
            const batch = writeBatch(db)

            for (const it of chunk) {
              if (it.id && it.id !== 'unknown' && !it.id.startsWith('local-no-id-')) {
                const raw = it.rawData || {}
                const normalizedTags = Array.isArray(it.tags)
                  ? it.tags.filter((t: any) => typeof t === 'string' && t.trim())
                  : Array.isArray(raw.tags)
                    ? raw.tags.filter((t: any) => typeof t === 'string' && t.trim())
                    : []
                const normalizedTagsLower = normalizedTags.map((t: string) =>
                  t.replace(/^#+/, '').trim().toLowerCase(),
                )

                const sanitizedDoc: any = {
                  ...raw,
                  id: it.id,
                  origin:
                    it.origin && it.origin !== '(Không có origin)'
                      ? it.origin.trim()
                      : (raw.origin || '').trim(),
                  uid: it.uid || raw.uid || user?.uid,
                  catId: it.catId ?? raw.catId ?? 1,
                  level: it.level ?? raw.level ?? 1,
                  tags: normalizedTags,
                  tags_lowercase: normalizedTagsLower,
                  meanings: Array.isArray(it.meanings)
                    ? it.meanings
                    : Array.isArray(raw.meanings)
                      ? raw.meanings
                      : [],
                  last_update: Date.now(),
                }
                delete sanitizedDoc.quiz
                const { id: _ignoreId, ...firestorePayload } = sanitizedDoc
                batch.set(doc(db, dbCollections.items, it.id), firestorePayload, { merge: true })
                await localDb.items.put(sanitizedDoc)
              }
            }

            await batch.commit()
          }

          if (user?.uid) {
            for (const it of localOnlyItems) {
              await syncService.removeUnsyncedRecord(user.uid, it.id)
            }
          }

          invalidateSearchIndex()
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

          const pushedIds = new Set(localOnlyItems.map((it) => it.id))
          setItems((prev) => prev.filter((it) => !pushedIds.has(it.id)))
          setSelectedRowKeys((prev) => prev.filter((k) => !pushedIds.has(String(k))))

          hideLoading()
          message.success(`Đã đẩy thành công ${localOnlyItems.length} item lên Firestore!`)
          handleScanServer()
        } catch (err: any) {
          hideLoading()
          console.error('Push all to Firestore failed:', err)
          message.error(`Lỗi khi đẩy lên Firestore: ${err?.message || err}`)
        }
      },
    })
  }

  // Pull an item from Server into Local DB
  const handlePullToLocalDb = async (record: IUnsyncableServerItem) => {
    if (!user?.uid) {
      message.error('Vui lòng đăng nhập.')
      return
    }

    const hideLoading = message.loading(`Đang tải item "${record.origin}" về Local DB...`, 0)
    try {
      let rawData = record.rawData
      if (!rawData || !rawData.origin) {
        // Fetch fresh doc from Firestore
        const docSnap = await getDoc(doc(db, dbCollections.items, record.id))
        if (docSnap.exists()) {
          rawData = { ...docSnap.data(), id: docSnap.id }
        }
      }

      if (!rawData) {
        throw new Error('Không tìm thấy dữ liệu trên Server')
      }

      const itemObj = normalizeItemForLocalDb(rawData, record.id, user.uid)
      await localDb.items.put(itemObj)
      invalidateSearchIndex()
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

      setItems((prev) => prev.filter((it) => it.id !== record.id))
      setSelectedRowKeys((prev) => prev.filter((k) => k !== record.id))

      setServerStats((prev) =>
        prev
          ? {
              ...prev,
              localCount: prev.localCount + 1,
            }
          : null,
      )

      hideLoading()
      message.success(`Đã tải và lưu item "${itemObj.origin}" vào Local DB thành công!`)
    } catch (err: any) {
      hideLoading()
      console.error('Pull item to Local DB failed:', err)
      message.error(`Lỗi khi tải về máy: ${err?.message || err}`)
    }
  }

  // Pull all items missing in local DB from server
  const handlePullAllToLocalDb = () => {
    const missingInLocal = items.filter(
      (it) =>
        it.reason.includes('thiếu trong Local DB') ||
        it.reason.includes('chưa được sync vào Local Database'),
    )
    if (missingInLocal.length === 0) return

    Modal.confirm({
      title: `Tải ${missingInLocal.length} item từ Server về Local Database?`,
      icon: <DownloadOutlined style={{ color: token.colorPrimary }} />,
      content: (
        <div>
          <Paragraph>
            Hệ thống sẽ tải toàn bộ <b>{missingInLocal.length}</b> item đang có trên Server nhưng
            thiếu trong Local DB về máy của bạn.
          </Paragraph>
        </div>
      ),
      okText: `Tải về ${missingInLocal.length} item`,
      okType: 'primary',
      cancelText: 'Hủy',
      onOk: async () => {
        const hideLoading = message.loading(`Đang tải ${missingInLocal.length} item về máy...`, 0)
        try {
          const itemsToPut: IItem[] = []
          for (const it of missingInLocal) {
            let rawData = it.rawData
            if (!rawData) {
              const docSnap = await getDoc(doc(db, dbCollections.items, it.id))
              if (docSnap.exists()) {
                rawData = { ...docSnap.data(), id: docSnap.id }
              }
            }
            if (rawData) {
              itemsToPut.push(normalizeItemForLocalDb(rawData, it.id, user?.uid || ''))
            }
          }

          if (itemsToPut.length > 0) {
            await localDb.items.bulkPut(itemsToPut)
          }

          invalidateSearchIndex()
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

          const pulledIds = new Set(missingInLocal.map((it) => it.id))
          setItems((prev) => prev.filter((it) => !pulledIds.has(it.id)))
          setSelectedRowKeys((prev) => prev.filter((k) => !pulledIds.has(String(k))))

          hideLoading()
          message.success(`Đã tải thành công ${itemsToPut.length} item về Local Database!`)
          handleScanServer()
        } catch (err: any) {
          hideLoading()
          console.error('Pull all items failed:', err)
          message.error(`Lỗi khi tải về Local DB: ${err?.message || err}`)
        }
      },
    })
  }

  // Batch delete selected items
  const handleBatchDelete = () => {
    const count = selectedRowKeys.length
    if (count === 0) return

    Modal.confirm({
      title: `Xóa vĩnh viễn ${count} item đã chọn khỏi Server?`,
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: (
        <div>
          <Paragraph>
            Thao tác này sẽ xóa vĩnh viễn <b>{count}</b> item đã chọn khỏi <b>Firebase Firestore</b>{' '}
            và <b>Local Database</b>.
          </Paragraph>
          <Paragraph type='danger'>Hành động này không thể hoàn tác!</Paragraph>
        </div>
      ),
      okText: `Xóa ${count} item`,
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        const hideLoading = message.loading(`Đang xóa ${count} items khỏi Firestore...`, 0)
        try {
          const idsToDelete = [...selectedRowKeys] as string[]

          // Batch delete from Firestore in chunks of 400
          for (let i = 0; i < idsToDelete.length; i += 400) {
            const chunk = idsToDelete.slice(i, i + 400)
            const batch = writeBatch(db)

            chunk.forEach((id) => {
              if (id && id !== 'unknown') {
                batch.delete(doc(db, dbCollections.items, id))
                if (user?.uid) {
                  const deletedRef = doc(db, dbCollections.deleted_records, `${user.uid}_${id}`)
                  batch.set(deletedRef, {
                    uid: user.uid,
                    recordId: id,
                    collectionName: dbCollections.items,
                    deleted_at: Timestamp.now(),
                  })
                }
              }
            })

            await batch.commit()
          }

          // Delete from localDb
          await localDb.items.bulkDelete(idsToDelete)

          // Clean up unsynced records
          if (user?.uid) {
            for (const id of idsToDelete) {
              await syncService.removeUnsyncedRecord(user.uid, id)
            }
          }

          invalidateSearchIndex()
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

          setItems((prev) => prev.filter((it) => !idsToDelete.includes(it.id)))
          setSelectedRowKeys([])

          hideLoading()
          message.success(`Đã xóa vĩnh viễn ${count} item khỏi Server!`)
        } catch (err: any) {
          hideLoading()
          console.error('Batch delete failed:', err)
          message.error(`Lỗi khi xóa hàng loạt: ${err?.message || err}`)
        }
      },
    })
  }

  // Auto-Fix common schema issues (e.g. malformed tags_lowercase or missing UID)
  const handleAutoFix = async () => {
    const fixableItems = items.filter(
      (it) =>
        it.id &&
        it.id !== 'unknown' &&
        it.origin &&
        it.origin !== '(Không có origin)' &&
        (it.reason.includes('tags_lowercase') ||
          it.reason.includes('Thiếu UID') ||
          it.reason.includes('tags')),
    )

    if (fixableItems.length === 0) {
      message.info('Không có item nào có thể tự động sửa lỗi (cần có Origin hợp lệ).')
      return
    }

    const hideLoading = message.loading(
      `Đang tự động sửa lỗi cho ${fixableItems.length} items...`,
      0,
    )
    try {
      let fixedCount = 0
      for (const it of fixableItems) {
        const raw = it.rawData || {}
        const normalizedTags = Array.isArray(raw.tags)
          ? raw.tags.filter((t: any) => typeof t === 'string' && t.trim())
          : []
        const normalizedTagsLower = normalizedTags.map((t: string) =>
          t.replace(/^#+/, '').trim().toLowerCase(),
        )

        const sanitizedDoc = {
          ...raw,
          id: it.id,
          origin: it.origin.trim(),
          uid: raw.uid || user?.uid,
          catId: raw.catId ?? 1,
          level: raw.level ?? 1,
          tags: normalizedTags,
          tags_lowercase: normalizedTagsLower,
          last_update: Date.now(),
        }

        // Update Firestore
        await setDoc(doc(db, dbCollections.items, it.id), sanitizedDoc, { merge: true })

        // Put to localDb
        await localDb.items.put(sanitizedDoc)

        // Remove from unsynced records
        if (user?.uid) {
          await syncService.removeUnsyncedRecord(user.uid, it.id)
        }

        fixedCount++
      }

      invalidateSearchIndex()
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

      const fixedIds = new Set(fixableItems.map((f) => f.id))
      setItems((prev) => prev.filter((it) => !fixedIds.has(it.id)))
      setSelectedRowKeys((prev) => prev.filter((k) => !fixedIds.has(String(k))))

      hideLoading()
      message.success(`Đã tự động sửa lỗi và đồng bộ thành công ${fixedCount} item!`)
    } catch (err: any) {
      hideLoading()
      console.error('Auto fix failed:', err)
      message.error(`Lỗi khi tự động sửa: ${err?.message || err}`)
    }
  }

  // Table Columns
  const columns: TableColumnsType<IUnsyncableServerItem> = [
    {
      title: 'Origin (Từ/Cụm từ)',
      dataIndex: 'origin',
      key: 'origin',
      width: 200,
      render: (origin: string, record) => {
        const isEmpty = !origin || origin === '(Không có origin)'
        return (
          <Space direction='vertical' size={2}>
            <Text strong style={{ color: isEmpty ? token.colorError : undefined }}>
              {isEmpty ? '(Trống Origin)' : origin}
            </Text>
            {record.catId !== undefined && (
              <Tag color='blue' style={{ fontSize: 11, margin: 0 }}>
                {getCategory(record.catId as ECategory)}
              </Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Document ID',
      dataIndex: 'id',
      key: 'id',
      width: 190,
      render: (id: string) => (
        <Text copyable={{ text: id }} code style={{ fontSize: 12 }}>
          {id}
        </Text>
      ),
    },
    {
      title: 'Lý do không thể sync / Tình trạng',
      dataIndex: 'reason',
      key: 'reason',
      width: 340,
      render: (reason: string, record) => {
        const parts = reason
          ? reason
              .split('; ')
              .map((p) => p.trim())
              .filter(Boolean)
          : []

        return (
          <Space direction='vertical' size={4} style={{ width: '100%' }}>
            {parts.map((p, idx) => {
              const isLocalMissingOnServer =
                record.source === 'local-db-only' ||
                p.includes('thiếu trên Server') ||
                p.includes('chưa có trên Firestore') ||
                p.includes('chưa sync lên Cloud') ||
                p.includes('Item trong Local DB bị thiếu ID')

              const isServerMissingInLocal =
                p.includes('thiếu trong Local DB') ||
                p.includes('chưa được sync vào Local Database')

              if (isLocalMissingOnServer) {
                return (
                  <Tag
                    key={idx}
                    color='orange'
                    icon={<CloudUploadOutlined />}
                    style={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      padding: '3px 8px',
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {p}
                  </Tag>
                )
              }

              if (isServerMissingInLocal) {
                return (
                  <Tag
                    key={idx}
                    color='blue'
                    icon={<DownloadOutlined />}
                    style={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      padding: '3px 8px',
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {p}
                  </Tag>
                )
              }

              return (
                <Tag
                  key={idx}
                  color='error'
                  icon={<ExclamationCircleOutlined />}
                  style={{
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    padding: '3px 8px',
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {p}
                </Tag>
              )
            })}
            {record.reasonDetails && (
              <Text type='secondary' style={{ fontSize: 11 }}>
                {record.reasonDetails}
              </Text>
            )}
          </Space>
        )
      },
    },
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
      width: 140,
      render: (uid?: string) =>
        uid ? (
          <Text copyable={{ text: uid }} style={{ fontSize: 11 }}>
            {uid.slice(0, 8)}...
          </Text>
        ) : (
          <Tag color='warning'>Chưa có UID</Tag>
        ),
    },
    {
      title: 'Cập nhật',
      dataIndex: 'last_update',
      key: 'last_update',
      width: 160,
      sorter: (a, b) => (a.last_update || 0) - (b.last_update || 0),
      render: (timestamp?: number) =>
        timestamp ? (
          <Text type='secondary' style={{ fontSize: 12 }}>
            {moment(timestamp).format('DD/MM/YYYY HH:mm')}
          </Text>
        ) : (
          <Text type='secondary' style={{ fontSize: 12 }}>
            —
          </Text>
        ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 175,
      fixed: 'right',
      render: (_, record) => {
        const isLocalOnly =
          record.source === 'local-db-only' ||
          record.reason.includes('thiếu trên Server') ||
          record.reason.includes('chưa có trên Firestore') ||
          record.reason.includes('chưa sync lên Cloud')
        const isServerMissingInLocal =
          record.reason.includes('thiếu trong Local DB') ||
          record.reason.includes('chưa được sync vào Local Database')
        return (
          <Space size={6}>
            <Tooltip title='Xem chi tiết / Raw JSON'>
              <Button size='small' icon={<EyeOutlined />} onClick={() => handleOpenView(record)} />
            </Tooltip>
            <Tooltip title='Sửa item (Fix & Sync)'>
              <Button
                size='small'
                type='primary'
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(record)}
              />
            </Tooltip>
            {isServerMissingInLocal && (
              <Tooltip title='Tải item này về Local DB (Sync to Local)'>
                <Button
                  size='small'
                  type='primary'
                  icon={<DownloadOutlined />}
                  onClick={() => handlePullToLocalDb(record)}
                />
              </Tooltip>
            )}
            {isLocalOnly && !isServerMissingInLocal && (
              <Tooltip title='Đẩy item này lên Firestore (Sync to Cloud)'>
                <Button
                  size='small'
                  type='primary'
                  icon={<CloudUploadOutlined />}
                  onClick={() => handlePushToFirestore(record)}
                />
              </Tooltip>
            )}
            <Tooltip title={isLocalOnly ? 'Xóa khỏi Local DB' : 'Xóa khỏi Firestore'}>
              <Button
                size='small'
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteItem(record)}
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <Card
      title={
        <Space style={{ marginBottom: token.size / 2, marginTop: token.size / 2 }}>
          <WarningOutlined style={{ color: token.colorWarning }} />
          <span>Xử lý Item không thể đồng bộ (Unsyncable & Desync Items)</span>
          {items.length > 0 && (
            <Tag color='error' style={{ fontWeight: 600 }}>
              {items.length} item cần xử lý
            </Tag>
          )}
          {localOnlyCount > 0 && (
            <Tag color='orange' style={{ fontWeight: 600 }}>
              {localOnlyCount} chưa sync lên Cloud
            </Tag>
          )}
        </Space>
      }
      size='small'
      style={{ borderColor: items.length > 0 ? token.colorWarningBorder : undefined }}
    >
      <Paragraph type='secondary' style={{ marginBottom: 12 }}>
        Phát hiện và xử lý lệch dữ liệu giữa <b>Firebase Firestore</b> và{' '}
        <b>Local Database (IndexedDB)</b>: item lỗi cấu trúc, thiếu Origin/ID, xung đột index, item
        đã xóa mềm trên Server, hoặc item chỉ có trong Local DB chưa được đồng bộ lên Cloud.
      </Paragraph>

      {/* Control bar */}
      <Space direction='vertical' style={{ width: '100%', marginBottom: 16 }} size={12}>
        <Row gutter={[12, 12]} align='middle' justify='space-between'>
          <Col xs={24} md={14}>
            <Space wrap>
              <Button
                type='primary'
                icon={<CloudSyncOutlined />}
                onClick={handleScanServer}
                loading={loading}
                disabled={!user}
              >
                Scan
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadCachedUnsyncedRecords}
                disabled={loading}
              >
                Làm mới
              </Button>
              {items.some((it) => it.origin && it.origin !== '(Không có origin)') && (
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={handleAutoFix}
                  disabled={loading || !user}
                >
                  Tự động sửa lỗi Tags/UID
                </Button>
              )}
              {selectedRowKeys.length > 0 && (
                <>
                  <Button
                    type='primary'
                    icon={<CloudUploadOutlined />}
                    onClick={handleBatchPushToFirestore}
                    disabled={loading || !user}
                  >
                    Đẩy {selectedRowKeys.length} item lên Firestore
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBatchDelete}
                    disabled={loading || !user}
                  >
                    Xóa {selectedRowKeys.length} item đã chọn
                  </Button>
                </>
              )}
            </Space>
          </Col>

          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Input
              placeholder='Tìm theo từ, ID, lý do lỗi, UID...'
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ maxWidth: 320 }}
            />
          </Col>
        </Row>

        <Space size={16} wrap>
          <Checkbox
            checked={onlyCurrentUser}
            onChange={(e) => setOnlyCurrentUser(e.target.checked)}
          >
            Chỉ quét item của tài khoản hiện tại ({user?.email || 'N/A'})
          </Checkbox>
        </Space>

        {/* Quick category filter tags */}
        {items.length > 0 && (
          <Space wrap size={6}>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Lọc nhanh:
            </Text>
            <Tag.CheckableTag
              checked={categoryFilter === 'all'}
              onChange={() => setCategoryFilter('all')}
            >
              Tất cả ({items.length})
            </Tag.CheckableTag>
            {localOnlyCount > 0 && (
              <Tag.CheckableTag
                checked={categoryFilter === 'local-only'}
                onChange={() => setCategoryFilter('local-only')}
              >
                Chưa sync lên Cloud ({localOnlyCount})
              </Tag.CheckableTag>
            )}
            {missingInLocalCount > 0 && (
              <Tag.CheckableTag
                checked={categoryFilter === 'server-only'}
                onChange={() => setCategoryFilter('server-only')}
              >
                Thiếu trong Local ({missingInLocalCount})
              </Tag.CheckableTag>
            )}
            {schemaErrorCount > 0 && (
              <Tag.CheckableTag
                checked={categoryFilter === 'schema-error'}
                onChange={() => setCategoryFilter('schema-error')}
              >
                Lỗi cấu trúc ({schemaErrorCount})
              </Tag.CheckableTag>
            )}
          </Space>
        )}

        {serverStats && (
          <Alert
            type={
              items.length > 0 || serverStats.localCount !== serverStats.activeServer
                ? 'warning'
                : 'success'
            }
            showIcon
            message={
              <Space direction='vertical' style={{ width: '100%' }} size={6}>
                <Space wrap align='center'>
                  <span>
                    <b>Tổng quan dữ liệu:</b> Firestore có <b>{serverStats.totalServer}</b>{' '}
                    documents | Local IndexedDB có <b>{serverStats.localCount}</b> items
                    {serverStats.localCount > serverStats.activeServer && (
                      <Tag color='orange' style={{ marginLeft: 6 }}>
                        Local nhiều hơn Server {serverStats.localCount - serverStats.activeServer}{' '}
                        item
                      </Tag>
                    )}
                    {serverStats.activeServer > serverStats.localCount && (
                      <Tag color='cyan' style={{ marginLeft: 6 }}>
                        Server nhiều hơn Local {serverStats.activeServer - serverStats.localCount}{' '}
                        item
                      </Tag>
                    )}
                    .
                  </span>
                </Space>
                {(localOnlyCount > 0 || missingInLocalCount > 0) && (
                  <Space wrap size={8} style={{ marginTop: 4 }}>
                    {localOnlyCount > 0 && (
                      <Button
                        size='small'
                        type='primary'
                        icon={<CloudUploadOutlined />}
                        onClick={handlePushAllLocalToFirestore}
                      >
                        Đẩy tất cả {localOnlyCount} item chưa sync lên Firestore
                      </Button>
                    )}
                    {missingInLocalCount > 0 && (
                      <Button
                        size='small'
                        type='primary'
                        icon={<DownloadOutlined />}
                        onClick={handlePullAllToLocalDb}
                      >
                        Tải tất cả {missingInLocalCount} item về Local DB
                      </Button>
                    )}
                  </Space>
                )}
              </Space>
            }
          />
        )}
      </Space>

      {/* Table */}
      <Table
        dataSource={filteredItems}
        columns={columns}
        rowKey='id'
        loading={loading}
        size='small'
        bordered
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total) => `Tổng cộng ${total} item cần xử lý`,
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 950 }}
        locale={{
          emptyText: (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              {hasScanned ? (
                <>
                  <CheckCircleOutlined style={{ fontSize: 32, color: token.colorSuccess }} />
                  <div style={{ marginTop: 8, color: token.colorTextSecondary }}>
                    Không có item nào bị lỗi đồng bộ hoặc lệch dữ liệu.
                  </div>
                </>
              ) : (
                <>
                  <SearchOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
                  <div style={{ marginTop: 8, color: token.colorTextSecondary }}>
                    Chưa quét dữ liệu. Bấm nút <b>"Scan"</b> để bắt đầu kiểm tra item không thể đồng
                    bộ.
                  </div>
                </>
              )}
            </div>
          ),
        }}
      />

      {/* VIEW MODAL */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: token.colorPrimary }} />
            <span>Chi tiết Item lỗi đồng bộ: {viewingItem?.origin || viewingItem?.id}</span>
          </Space>
        }
        open={isViewModalOpen}
        onCancel={() => {
          setIsViewModalOpen(false)
          setViewingItem(null)
        }}
        footer={[
          <Button
            key='edit'
            type='primary'
            icon={<EditOutlined />}
            onClick={() => {
              if (viewingItem) {
                setIsViewModalOpen(false)
                handleOpenEdit(viewingItem)
              }
            }}
          >
            Sửa item này
          </Button>,
          <Button
            key='close'
            onClick={() => {
              setIsViewModalOpen(false)
              setViewingItem(null)
            }}
          >
            Đóng
          </Button>,
        ]}
        width={750}
      >
        {viewingItem && (
          <Space direction='vertical' style={{ width: '100%' }} size={12}>
            <Alert
              message='Lý do không thể đồng bộ'
              description={viewingItem.reason}
              type='error'
              showIcon
            />

            <Tabs
              defaultActiveKey='info'
              items={[
                {
                  key: 'info',
                  label: 'Thông tin chung',
                  children: (
                    <div style={{ maxHeight: 420, overflow: 'auto' }}>
                      <Row gutter={[12, 12]}>
                        <Col span={12}>
                          <Text type='secondary'>Origin:</Text>
                          <div>
                            <Text strong style={{ fontSize: 16 }}>
                              {viewingItem.origin}
                            </Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text type='secondary'>ID:</Text>
                          <div>
                            <Text code copyable={{ text: viewingItem.id }}>
                              {viewingItem.id}
                            </Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text type='secondary'>Danh mục:</Text>
                          <div>
                            <Tag color='blue'>
                              {getCategory((viewingItem.catId ?? 1) as ECategory)}
                            </Tag>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text type='secondary'>UID:</Text>
                          <div>
                            <Text copyable={{ text: viewingItem.uid || '' }}>
                              {viewingItem.uid || 'N/A'}
                            </Text>
                          </div>
                        </Col>
                        <Col span={24}>
                          <Text type='secondary'>Tags:</Text>
                          <div style={{ marginTop: 4 }}>
                            {Array.isArray(viewingItem.tags) && viewingItem.tags.length > 0 ? (
                              viewingItem.tags.map((t, idx) => (
                                <Tag key={idx} color='cyan'>
                                  {t}
                                </Tag>
                              ))
                            ) : (
                              <Text italic type='secondary'>
                                (Không có tags)
                              </Text>
                            )}
                          </div>
                        </Col>
                        <Col span={24}>
                          <Text type='secondary'>Meanings (Định nghĩa & Nghĩa):</Text>
                          <div style={{ marginTop: 4 }}>
                            {Array.isArray(viewingItem.meanings) &&
                            viewingItem.meanings.length > 0 ? (
                              viewingItem.meanings.map((m: any, idx: number) => (
                                <Card size='small' key={idx} style={{ marginBottom: 6 }}>
                                  <div>
                                    <b>Định nghĩa:</b> {m.definition || '—'}
                                  </div>
                                  <div>
                                    <b>Nghĩa tiếng Việt:</b> {m.translation || '—'}
                                  </div>
                                  {Array.isArray(m.examples) && m.examples.length > 0 && (
                                    <div style={{ marginTop: 4 }}>
                                      <b>Ví dụ ({m.examples.length}):</b>
                                      {m.examples.map((ex: any, exIdx: number) => (
                                        <div key={exIdx} style={{ fontSize: 12, paddingLeft: 8 }}>
                                          • {ex.origin || ex}{' '}
                                          {ex.translation ? `— ${ex.translation}` : ''}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </Card>
                              ))
                            ) : (
                              <Text italic type='secondary'>
                                (Không có meanings)
                              </Text>
                            )}
                          </div>
                        </Col>
                      </Row>
                    </div>
                  ),
                },
                {
                  key: 'raw-json',
                  label: (
                    <Space>
                      <CodeOutlined />
                      <span>Raw Document JSON</span>
                    </Space>
                  ),
                  children: (
                    <div>
                      <Space style={{ marginBottom: 8 }}>
                        <Button
                          size='small'
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              JSON.stringify(viewingItem.rawData || viewingItem, null, 2),
                            )
                            message.success('Đã sao chép Raw JSON vào clipboard!')
                          }}
                        >
                          Sao chép JSON
                        </Button>
                        <Button
                          size='small'
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            const blob = new Blob(
                              [JSON.stringify(viewingItem.rawData || viewingItem, null, 2)],
                              { type: 'application/json' },
                            )
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `item_${viewingItem.id}.json`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                        >
                          Tải JSON về
                        </Button>
                      </Space>
                      <pre
                        style={{
                          maxHeight: 380,
                          overflow: 'auto',
                          backgroundColor: token.colorBgContainerDisabled || '#1f1f1f',
                          color: token.colorText,
                          padding: 12,
                          borderRadius: 6,
                          fontSize: 12,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {JSON.stringify(viewingItem.rawData || viewingItem, null, 2)}
                      </pre>
                    </div>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: token.colorPrimary }} />
            <span>Sửa & Đồng bộ Item: {editingItem?.id}</span>
          </Space>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false)
          setEditingItem(null)
        }}
        footer={[
          <Button
            key='cancel'
            onClick={() => {
              setIsEditModalOpen(false)
              setEditingItem(null)
            }}
          >
            Hủy
          </Button>,
          <Button
            key='save'
            type='primary'
            icon={<SaveOutlined />}
            loading={isSaving}
            onClick={handleSaveEdit}
          >
            Lưu lên Server & Sync Local DB
          </Button>,
        ]}
        width={750}
      >
        {editingItem && (
          <Space direction='vertical' style={{ width: '100%' }} size={12}>
            <Alert
              message={`Lỗi hiện tại: ${editingItem.reason}`}
              type='warning'
              showIcon
              style={{ marginBottom: 8 }}
            />

            <Tabs
              activeKey={editTab}
              onChange={(k) => setEditTab(k as 'form' | 'json')}
              items={[
                {
                  key: 'form',
                  label: 'Biểu mẫu trực quan',
                  children: (
                    <div style={{ maxHeight: 450, overflow: 'auto', paddingRight: 4 }}>
                      <Row gutter={[12, 12]}>
                        <Col span={24}>
                          <Text strong>
                            Origin (Từ / Cụm từ tiếng Anh): <span style={{ color: 'red' }}>*</span>
                          </Text>
                          <Input
                            placeholder='Nhập từ vựng hoặc cụm từ...'
                            value={editOrigin}
                            onChange={(e) => setEditOrigin(e.target.value)}
                            status={!editOrigin.trim() ? 'error' : undefined}
                            style={{ marginTop: 4 }}
                          />
                        </Col>

                        <Col span={12}>
                          <Text strong>Danh mục (Category):</Text>
                          <Select
                            style={{ width: '100%', marginTop: 4 }}
                            value={editCatId}
                            onChange={(val) => setEditCatId(Number(val))}
                            options={categories
                              .filter((c) => c.id !== 0)
                              .map((c) => ({
                                label: c.label,
                                value: c.id,
                              }))}
                          />
                        </Col>

                        <Col span={12}>
                          <Text strong>Độ khó (Level):</Text>
                          <Select
                            style={{ width: '100%', marginTop: 4 }}
                            value={editLevel}
                            onChange={(val) => setEditLevel(Number(val))}
                            options={[1, 2, 3, 4, 5].map((lvl) => ({
                              label: `Level ${lvl}`,
                              value: lvl,
                            }))}
                          />
                        </Col>

                        <Col span={24}>
                          <Text strong>UID người dùng:</Text>
                          <Input
                            placeholder='User UID...'
                            value={editUid}
                            onChange={(e) => setEditUid(e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </Col>

                        <Col span={24}>
                          <Text strong>Tags:</Text>
                          <Select
                            mode='tags'
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder='Nhập tag và bấm Enter...'
                            value={editTags}
                            onChange={(val) => setEditTags(val as string[])}
                          />
                        </Col>

                        <Col span={24}>
                          <Divider style={{ margin: '8px 0' }} />
                          <Text strong>Nghĩa chính (Meaning 1):</Text>
                        </Col>

                        <Col span={24}>
                          <Text type='secondary'>Định nghĩa (Definition):</Text>
                          <Input.TextArea
                            rows={2}
                            placeholder='Định nghĩa tiếng Anh...'
                            value={editDefinition}
                            onChange={(e) => setEditDefinition(e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </Col>

                        <Col span={24}>
                          <Text type='secondary'>Bản dịch (Translation):</Text>
                          <Input
                            placeholder='Nghĩa tiếng Việt...'
                            value={editTranslation}
                            onChange={(e) => setEditTranslation(e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </Col>
                      </Row>
                    </div>
                  ),
                },
                {
                  key: 'json',
                  label: (
                    <Space>
                      <CodeOutlined />
                      <span>Sửa trực tiếp Raw JSON</span>
                    </Space>
                  ),
                  children: (
                    <div>
                      <Paragraph type='secondary' style={{ fontSize: 12 }}>
                        Chỉnh sửa trực tiếp object JSON sẽ được lưu vào Firestore và IndexedDB. Đảm
                        bảo cú pháp JSON hợp lệ.
                      </Paragraph>
                      <Input.TextArea
                        rows={16}
                        value={editJsonText}
                        onChange={(e) => setEditJsonText(e.target.value)}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          backgroundColor: token.colorBgContainerDisabled || '#1f1f1f',
                          color: token.colorText,
                        }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Modal>
    </Card>
  )
}

export default UnsyncableServerItemsCard

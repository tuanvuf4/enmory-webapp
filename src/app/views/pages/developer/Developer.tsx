import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card,
  Tabs,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Spin,
  message,
  Statistic,
  theme,
  Alert,
  Tooltip,
  Table,
  Modal,
  Checkbox,
  Descriptions,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  DatabaseOutlined,
  CheckOutlined,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  ApiOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  StarFilled,
  ThunderboltOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { useDispatch, useSelector, checklistKeys, itemKeys, useDeleteBlog } from '@/core/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { invalidateSearchIndex, localDb } from '@/services/localDb'
import { itemApi } from '@/services/firebase/api/item.api'
import { doc, collection, getDocs, query, where } from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { useItemModal } from '@/helpers/hooks/useItemModal'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import { IItem, IMeaning, ECategory } from '@/models/item.model'
import { IBlogItem } from '@/models/blog.model'
import { ISyncMeta } from '@/services/localDb/db'
import { getCategory, getType } from '@/helpers/item'
import { GeminiUsageTab } from './GeminiUsageTab'
import { useGeminiStats } from '@/services/gemini'
import './developer.module.scss'
import { appSetting } from '@/config/index'
import moment from 'moment'

const { Text, Paragraph } = Typography

type TableType = 'all' | 'items' | 'blogs' | 'syncMeta'

export const Developer: React.FC = () => {
  const { token } = theme.useToken()

  // Guard: Dev mode only
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { openItemModal } = useItemModal()
  const { openBlogModal } = useBlogModal()
  const { mutateAsync: deleteBlogMutation } = useDeleteBlog()
  const [isSyncingBlogs, setIsSyncingBlogs] = useState<boolean>(false)
  const geminiStats = useGeminiStats()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromQuery = searchParams.get('tab')

  // Main page tab: 'local-db' | 'firebase-tools' | 'gemini-tracker'
  const [mainTab, setMainTab] = useState<string>(() => {
    if (tabFromQuery === 'gemini' || tabFromQuery === 'gemini-tracker') return 'gemini-tracker'
    if (tabFromQuery === 'firebase' || tabFromQuery === 'firebase-tools') return 'firebase-tools'
    return 'local-db'
  })

  useEffect(() => {
    if (tabFromQuery === 'gemini' || tabFromQuery === 'gemini-tracker') {
      setMainTab('gemini-tracker')
    } else if (tabFromQuery === 'firebase' || tabFromQuery === 'firebase-tools') {
      setMainTab('firebase-tools')
    }
  }, [tabFromQuery])

  const handleTabChange = (key: string) => {
    setMainTab(key)
    if (key === 'gemini-tracker') {
      setSearchParams({ tab: 'gemini' })
    } else if (key === 'firebase-tools') {
      setSearchParams({ tab: 'firebase' })
    } else {
      setSearchParams({})
    }
  }

  // ================= Local DB State =================
  const [loading, setLoading] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<TableType>('items')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<IItem | null>(null)
  const [selectedRecordJson, setSelectedRecordJson] = useState<{ title: string; data: any } | null>(
    null,
  )
  const [showFullJson, setShowFullJson] = useState<boolean>(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filterByUser, setFilterByUser] = useState<boolean>(true)
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false)
  const [isEditingJson, setIsEditingJson] = useState<boolean>(false)
  const [editingJsonText, setEditingJsonText] = useState<string>('')

  const [items, setItems] = useState<IItem[]>([])
  const [blogs, setBlogs] = useState<IBlogItem[]>([])
  const [syncMeta, setSyncMeta] = useState<ISyncMeta[]>([])

  // ================= Firebase Maintenance State =================

  const [isRemovingLegacyFields, setIsRemovingLegacyFields] = useState<boolean>(false)
  const [removeLegacyFieldsStatus, setRemoveLegacyFieldsStatus] = useState<string>('')
  const [isPurging, setIsPurging] = useState<boolean>(false)
  const [purgeStatus, setPurgeStatus] = useState<string>('')
  const [purgeOnlyCurrentUser, setPurgeOnlyCurrentUser] = useState<boolean>(true)
  const [purgedItems, setPurgedItems] = useState<
    { id: string; origin: string; uid?: string; deleted_date?: number }[]
  >([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [loadedItems, loadedBlogs, loadedSyncMeta] = await Promise.all([
        localDb.items.toArray(),
        localDb.blogs.toArray(),
        localDb.syncMeta.toArray(),
      ])

      // Auto-fetch blogs from Firestore if localDb has no blogs or fewer blogs
      if (user?.uid) {
        try {
          const blogsRef = collection(db, dbCollections.blogs || dbCollections.articles)
          const q = query(blogsRef, where('uid', '==', user.uid))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const cloudBlogs: IBlogItem[] = []
            snap.forEach((d) => {
              const data = d.data()
              if (!data.is_deleted) {
                cloudBlogs.push({
                  ...data,
                  id: d.id,
                  uid: data.uid || user.uid,
                  title: data.title || '(Không có tiêu đề)',
                  description: data.description || '',
                  tags: data.tags || [],
                  created_date: data.created_date || 0,
                  last_update: data.last_update || data.created_date || 0,
                } as IBlogItem)
              }
            })
            if (cloudBlogs.length > 0) {
              await localDb.blogs.bulkPut(cloudBlogs)
              const allFreshBlogs = await localDb.blogs.toArray()
              loadedBlogs.splice(0, loadedBlogs.length, ...allFreshBlogs)
            }
          }
        } catch (cloudErr) {
          console.warn('Auto-sync blogs on load error:', cloudErr)
        }
      }

      setItems(loadedItems)
      setBlogs([...loadedBlogs])
      setSyncMeta(loadedSyncMeta)
      setSelectedRowKeys((prev) => prev.filter((k) => loadedItems.some((it) => it.id === k)))
    } catch (err) {
      console.error('Failed to load local database:', err)
      message.error(
        'Failed to load local database: ' + (err instanceof Error ? err.message : String(err)),
      )
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  const handleSyncBlogsFromCloud = useCallback(async () => {
    setIsSyncingBlogs(true)
    try {
      const blogsRef = collection(db, dbCollections.blogs || dbCollections.articles)
      let snap
      if (user?.uid) {
        try {
          const q = query(blogsRef, where('uid', '==', user.uid))
          snap = await getDocs(q)
        } catch {
          snap = await getDocs(blogsRef)
        }
      } else {
        snap = await getDocs(blogsRef)
      }

      const cloudBlogs: IBlogItem[] = []
      snap.forEach((d) => {
        const data = d.data()
        if (!data.is_deleted) {
          cloudBlogs.push({
            ...data,
            id: d.id,
            uid: data.uid || user?.uid,
            title: data.title || '(Không có tiêu đề)',
            description: data.description || '',
            tags: data.tags || [],
            created_date: data.created_date || 0,
            last_update: data.last_update || data.created_date || 0,
          } as IBlogItem)
        }
      })

      if (cloudBlogs.length > 0) {
        await localDb.blogs.bulkPut(cloudBlogs)
      }
      const updatedBlogs = await localDb.blogs.toArray()
      setBlogs(updatedBlogs)
      message.success(`Đã đồng bộ ${cloudBlogs.length} bài viết từ Firestore!`)
    } catch (err: any) {
      console.error('Lỗi khi đồng bộ blogs:', err)
      message.error(
        'Không thể đồng bộ bài viết từ Cloud: ' + (err?.message || 'Lỗi không xác định'),
      )
    } finally {
      setIsSyncingBlogs(false)
    }
  }, [user?.uid])

  const handleEditBlog = useCallback(
    (record: IBlogItem) => {
      openBlogModal('edit', record, () => {
        loadData()
      })
    },
    [openBlogModal, loadData],
  )

  const handleDeleteBlog = useCallback(
    (record: IBlogItem) => {
      const recordId = record.id?.trim()
      Modal.confirm({
        title: `Xác nhận xóa bài viết "${record.title || '(Không có tiêu đề)'}"?`,
        icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
        content: (
          <div>
            <p>Hành động này sẽ xóa bài viết khỏi Local Database và Firebase Firestore.</p>
            {recordId && (
              <p style={{ fontSize: 12, color: token.colorTextSecondary }}>
                Blog ID: <code>{recordId}</code>
              </p>
            )}
          </div>
        ),
        okText: 'Xác nhận xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            if (recordId) {
              await deleteBlogMutation(recordId)
            } else {
              await localDb.blogs.where('title').equals(record.title).delete()
            }
            message.success('Đã xóa bài viết thành công!')
            await loadData()
          } catch (err: any) {
            console.error('Lỗi khi xóa bài viết:', err)
            if (recordId) {
              await localDb.blogs.delete(recordId)
              await loadData()
              message.warning('Đã xóa bài viết khỏi Local DB.')
            } else {
              message.error('Không thể xóa bài viết: ' + (err?.message || 'Lỗi không xác định'))
            }
          }
        },
      })
    },
    [deleteBlogMutation, loadData, token],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleEditItem = useCallback(
    (record: IItem) => {
      const recordId = record.id
      openItemModal('edit', record, () => {
        loadData()
        if (recordId && selectedItem?.id === recordId) {
          localDb.items.get(recordId).then((fresh) => {
            if (fresh) setSelectedItem(fresh)
          })
        } else if (selectedItem?.origin === record.origin) {
          localDb.items
            .where('origin')
            .equals(record.origin)
            .first()
            .then((fresh) => {
              if (fresh) setSelectedItem(fresh)
            })
        }
      })
    },
    [openItemModal, loadData, selectedItem?.id, selectedItem?.origin],
  )

  const deleteItemFromLocalDb = useCallback(async (record: Partial<IItem>) => {
    const recordId = record.id?.trim()
    if (recordId) {
      await localDb.items.delete(recordId)
    }
    // Delete any records with missing/empty id matching this item
    await localDb.items
      .filter((it) => {
        if (recordId && it.id === recordId) return true
        if (!recordId) {
          const matchOrigin = (it.origin || '').trim() === (record.origin || '').trim()
          const matchCreated = record.created_date ? it.created_date === record.created_date : true
          const matchNoId = !it.id || !it.id.trim()
          return matchOrigin && matchCreated && matchNoId
        }
        return false
      })
      .delete()
  }, [])

  const missingIdItems = useMemo(() => {
    return items.filter((it) => !it.id || !String(it.id).trim())
  }, [items])

  const handleForceDeleteAllMissingIdItems = useCallback(() => {
    const count = missingIdItems.length
    if (count === 0) return

    Modal.confirm({
      title: `Force Delete toàn bộ ${count} item không có ID?`,
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: (
        <div>
          <p>
            Hệ thống phát hiện <b>{count}</b> item có ID bị rỗng hoặc không tồn tại trong Local
            Database.
          </p>
          <p style={{ color: token.colorError, fontWeight: 500, margin: 0 }}>
            Thao tác Force Delete này sẽ quét toàn bộ IndexedDB và xóa triệt để các item lỗi này!
          </p>
        </div>
      ),
      okText: `Force Delete ${count} items`,
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        const hideLoading = message.loading(`Đang Force Delete ${count} items...`, 0)
        try {
          await localDb.items.filter((it) => !it.id || !String(it.id).trim()).delete()
          invalidateSearchIndex()
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

          hideLoading()
          message.success(`Đã Force Delete thành công ${count} items không có ID!`)
          await loadData()
          setSelectedRowKeys([])
        } catch (err: any) {
          hideLoading()
          console.error('Force delete error:', err)
          message.error('Lỗi khi Force Delete: ' + (err?.message || String(err)))
        }
      },
    })
  }, [missingIdItems.length, token, queryClient, loadData])

  const handleDeleteItem = useCallback(
    (record: IItem, force = false) => {
      const recordId = record.id?.trim()
      const isMissingId = !recordId

      // Case 1: Item has NO ID or force requested -> Direct Force Delete
      if (isMissingId || force) {
        Modal.confirm({
          title: `Force Delete item "${record.origin || '(Không có origin)'}"?`,
          icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
          content: (
            <div>
              <p style={{ color: token.colorError, fontWeight: 500 }}>
                {isMissingId
                  ? 'Item này không có ID trong cơ sở dữ liệu!'
                  : `Xóa cưỡng chế item ID: ${recordId}`}
              </p>
              <p>
                Hệ thống sẽ thực hiện <b>Force Delete</b> để xóa trực tiếp item này khỏi Local
                Database (IndexedDB), bỏ qua các ràng buộc ID và kiểm tra Firebase.
              </p>
            </div>
          ),
          okText: 'Force Delete',
          okType: 'danger',
          cancelText: 'Hủy',
          onOk: async () => {
            try {
              await deleteItemFromLocalDb(record)
              invalidateSearchIndex()
              await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
              await queryClient.invalidateQueries({ queryKey: checklistKeys.all })
              if (recordId) {
                queryClient.removeQueries({ queryKey: itemKeys.detail(recordId) })
                dispatch(iotdAction.removeItem(recordId))
              }
              message.success(`Đã Force Delete item "${record.origin || ''}" thành công!`)
              await loadData()
              if (selectedItem?.origin === record.origin) {
                setSelectedItem(null)
              }
            } catch (err: any) {
              console.error('Force delete error:', err)
              message.error('Lỗi khi Force Delete: ' + (err?.message || String(err)))
            }
          },
        })
        return
      }

      // Case 2: Standard delete with Firebase sync option
      let onlyLocal = false
      Modal.confirm({
        title: `Xác nhận xóa từ vựng "${record.origin}"?`,
        icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
        content: (
          <div>
            <p>
              Bạn có chắc chắn muốn xóa từ vựng <b>{record.origin}</b> (ID: <code>{recordId}</code>
              )?
            </p>
            {user?.uid ? (
              <Checkbox
                defaultChecked={false}
                onChange={(e) => {
                  onlyLocal = e.target.checked
                }}
                style={{ marginTop: 8 }}
              >
                Chỉ xóa trong Local DB (không xóa trên Firebase)
              </Checkbox>
            ) : (
              <p style={{ color: token.colorWarning, fontSize: 12, margin: '8px 0 0 0' }}>
                (Bạn chưa đăng nhập Firebase, item sẽ chỉ bị xóa khỏi Local DB)
              </p>
            )}
          </div>
        ),
        okText: 'Xác nhận xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            if (!onlyLocal && user?.uid && recordId) {
              try {
                await itemApi.deleteItem(recordId, record.origin)
              } catch (err: any) {
                console.warn('Firebase deletion error:', err)
                message.warning(
                  'Không thể xóa trên Firebase (' +
                    (err?.message || 'Lỗi') +
                    '), đang xóa khỏi Local DB...',
                )
              }
            }

            await deleteItemFromLocalDb(record)
            invalidateSearchIndex()
            await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
            if (recordId) {
              queryClient.removeQueries({ queryKey: itemKeys.detail(recordId) })
              await queryClient.invalidateQueries({ queryKey: itemKeys.detail(recordId) })
              dispatch(iotdAction.removeItem(recordId))
            }
            await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

            message.success(`Đã xóa từ vựng "${record.origin}" thành công!`)
            await loadData()
            if (recordId) {
              setSelectedRowKeys((prev) => prev.filter((k) => k !== recordId))
            }
            if (selectedItem?.id === recordId) {
              setSelectedItem(null)
            }
          } catch (error: any) {
            console.error('Delete item error:', error)
            message.error('Lỗi khi xóa item: ' + (error?.message || String(error)))
          }
        },
      })
    },
    [
      token,
      user?.uid,
      queryClient,
      dispatch,
      loadData,
      selectedItem?.id,
      selectedItem?.origin,
      deleteItemFromLocalDb,
    ],
  )

  const handleBatchDelete = useCallback(() => {
    let onlyLocal = false
    const count = selectedRowKeys.length
    if (count === 0) return

    Modal.confirm({
      title: `Xác nhận xóa ${count} items đã chọn?`,
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: (
        <div>
          <p>
            Bạn có chắc chắn muốn xóa <b>{count}</b> items đã chọn khỏi cơ sở dữ liệu?
          </p>
          {user?.uid ? (
            <Checkbox
              defaultChecked={false}
              onChange={(e) => {
                onlyLocal = e.target.checked
              }}
              style={{ marginTop: 8 }}
            >
              Chỉ xóa trong Local DB (không xóa trên Firebase)
            </Checkbox>
          ) : (
            <p style={{ color: token.colorWarning, fontSize: 12, margin: '8px 0 0 0' }}>
              (Bạn chưa đăng nhập Firebase, các items sẽ chỉ bị xóa khỏi Local DB)
            </p>
          )}
        </div>
      ),
      okText: `Xác nhận xóa ${count} items`,
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setIsBatchDeleting(true)
        const hideLoading = message.loading(`Đang xóa ${count} items...`, 0)
        try {
          const keysToDelete = selectedRowKeys.map((k) => String(k))
          for (const key of keysToDelete) {
            if (key.startsWith('missing_id_')) {
              const matched = items.find(
                (it, idx) => `missing_id_${it.origin || ''}_${it.created_date || idx}` === key,
              )
              if (matched) {
                await deleteItemFromLocalDb(matched)
              } else {
                await localDb.items.filter((it) => !it.id || !it.id.trim()).delete()
              }
            } else {
              if (!onlyLocal && user?.uid) {
                try {
                  await itemApi.deleteItem(key)
                } catch (e) {
                  console.warn(`Failed to delete item ${key} from Firebase:`, e)
                }
              }
              await localDb.items.delete(key)
              queryClient.removeQueries({ queryKey: itemKeys.detail(key) })
              dispatch(iotdAction.removeItem(key))
            }
          }
          invalidateSearchIndex()
          await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

          hideLoading()
          message.success(`Đã xóa ${keysToDelete.length} items thành công!`)
          setSelectedRowKeys([])
          await loadData()
        } catch (err: any) {
          hideLoading()
          console.error('Batch delete items error:', err)
          message.error('Lỗi khi xóa hàng loạt: ' + (err?.message || String(err)))
        } finally {
          setIsBatchDeleting(false)
        }
      },
    })
  }, [
    selectedRowKeys,
    token,
    user?.uid,
    queryClient,
    dispatch,
    loadData,
    items,
    deleteItemFromLocalDb,
  ])

  const handleSaveJsonEdit = async () => {
    try {
      const parsed = JSON.parse(editingJsonText)
      if (parsed.key !== undefined) {
        await localDb.syncMeta.put(parsed as ISyncMeta)
        message.success('Đã cập nhật SyncMeta thành công!')
        setSelectedRecordJson({ title: String(parsed.key), data: parsed })
        setIsEditingJson(false)
        await loadData()
        return
      }

      if (parsed.title !== undefined && parsed.description !== undefined) {
        await localDb.blogs.put(parsed as IBlogItem)
        message.success('Đã cập nhật Blog thành công!')
        setSelectedRecordJson({ title: String(parsed.title), data: parsed })
        setIsEditingJson(false)
        await loadData()
        return
      }

      const itemToSave = parsed as IItem
      let itemId = parsed.id ? String(parsed.id).trim() : ''

      if (!itemId) {
        // Auto-generate a new ID if item had no ID
        itemId = doc(collection(db, dbCollections.items)).id
        itemToSave.id = itemId

        // Delete the old un-identified record from localDb
        if (selectedRecordJson?.data) {
          await deleteItemFromLocalDb(selectedRecordJson.data as Partial<IItem>)
        }
      }

      await localDb.items.put(itemToSave)
      invalidateSearchIndex()

      if (user?.uid) {
        try {
          await itemApi.updateItem(itemId, itemToSave)
        } catch (e: any) {
          console.warn('Firebase sync warning during JSON update:', e)
          message.warning(
            'Lưu Local DB thành công, nhưng không thể đồng bộ Firebase: ' + (e?.message || 'Lỗi'),
          )
        }
      }

      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: itemKeys.detail(itemId) })

      message.success('Đã lưu thay đổi JSON thành công!')
      setSelectedRecordJson({
        title: itemToSave.origin || selectedRecordJson?.title || 'Item',
        data: itemToSave,
      })
      setIsEditingJson(false)
      await loadData()
      if (selectedItem?.id === itemId) {
        setSelectedItem(itemToSave)
      }
    } catch (e: any) {
      console.error('JSON parse error:', e)
      message.error('Lỗi định dạng JSON không hợp lệ: ' + (e?.message || String(e)))
    }
  }

  // User-scoped items & blogs
  const scopedItems = useMemo(() => {
    if (!filterByUser || !user?.uid) return items
    return items.filter((it) => it.uid === user.uid)
  }, [items, filterByUser, user?.uid])

  const scopedBlogs = useMemo(() => {
    if (!filterByUser || !user?.uid) return blogs
    return blogs.filter((b) => b.uid === user.uid)
  }, [blogs, filterByUser, user?.uid])

  // Filter items by search keyword
  const filteredItems = useMemo(() => {
    if (!searchKeyword.trim()) return scopedItems
    const kw = searchKeyword.toLowerCase()
    return scopedItems.filter((item) => {
      const originMatch = (item.origin || '').toLowerCase().includes(kw)
      const tagsMatch = (item.tags || []).some((t) => (t || '').toLowerCase().includes(kw))
      const meaningMatch = (item.meanings || []).some(
        (m) =>
          (m.definition || '').toLowerCase().includes(kw) ||
          (m.translation || '').toLowerCase().includes(kw),
      )
      return originMatch || tagsMatch || meaningMatch
    })
  }, [scopedItems, searchKeyword])

  // Filter blogs by search keyword
  const filteredBlogs = useMemo(() => {
    if (!searchKeyword.trim()) return scopedBlogs
    const kw = searchKeyword.toLowerCase()
    return scopedBlogs.filter(
      (b) =>
        (b.title || '').toLowerCase().includes(kw) ||
        (b.description || '').toLowerCase().includes(kw) ||
        (b.tags || []).some((t) =>
          String(t || '')
            .toLowerCase()
            .includes(kw),
        ),
    )
  }, [scopedBlogs, searchKeyword])

  // Filter syncMeta by search keyword
  const filteredSyncMeta = useMemo(() => {
    if (!searchKeyword.trim()) return syncMeta
    const kw = searchKeyword.toLowerCase()
    return syncMeta.filter((meta) => (meta.key || '').toLowerCase().includes(kw))
  }, [syncMeta, searchKeyword])

  // Active dataset for JSON export / copy
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'items':
        return filteredItems
      case 'blogs':
        return filteredBlogs
      case 'syncMeta':
        return filteredSyncMeta
      case 'all':
      default:
        return {
          _database: 'EnmoryLocalDB',
          _exported_at: new Date().toISOString(),
          _counts: {
            items: filteredItems.length,
            blogs: filteredBlogs.length,
            syncMeta: filteredSyncMeta.length,
          },
          items: filteredItems,
          blogs: filteredBlogs,
          syncMeta: filteredSyncMeta,
        }
    }
  }, [activeTab, filteredItems, filteredBlogs, filteredSyncMeta])

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(activeDataset, null, 2))
    setCopied(true)
    message.success('JSON copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const filename = `local-db-${activeTab}-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([JSON.stringify(activeDataset, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`Downloaded ${filename}`)
  }

  const formattedRecordJson = useMemo(() => {
    if (!selectedRecordJson?.data) return ''
    try {
      return JSON.stringify(selectedRecordJson.data, null, 2)
    } catch (err: any) {
      return `[Lỗi chuyển đổi dữ liệu thành JSON: ${err?.message || String(err)}]`
    }
  }, [selectedRecordJson])

  const isHugeRecordJson = formattedRecordJson.length > 30000

  const getMeaningTypeLabel = (m: IMeaning) => {
    if (m.typeId !== undefined) {
      return getType(m.typeId).abbr || getType(m.typeId).origin
    }
    return (m as any).type || ''
  }

  // ================= Table Column Definitions =================
  const itemColumns = useMemo<TableColumnsType<IItem>>(
    () => [
      {
        title: '#',
        key: 'index',
        width: 55,
        align: 'center',
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Origin / Từ vựng',
        dataIndex: 'origin',
        key: 'origin',
        width: 200,
        sorter: (a, b) => (a.origin || '').localeCompare(b.origin || ''),
        render: (text: string, record: IItem) => (
          <Space direction='vertical' size={2}>
            <Space>
              <Text strong style={{ fontSize: 14, color: token.colorPrimary }}>
                {text || (
                  <Text italic type='secondary'>
                    (No origin)
                  </Text>
                )}
              </Text>
              {!record.id && (
                <Tooltip title='Bản ghi này bị thiếu ID trong IndexedDB'>
                  <Tag color='error' style={{ margin: 0, fontSize: 10 }}>
                    NO ID
                  </Tag>
                </Tooltip>
              )}
              {record.favorite && <StarFilled style={{ color: '#faad14' }} />}
            </Space>
            <Space size={4} wrap>
              {record.catId !== undefined && (
                <Tag color='blue' style={{ margin: 0, fontSize: 11 }}>
                  {getCategory(record.catId as ECategory)}
                </Tag>
              )}
              {record.archive && (
                <Tag color='default' style={{ margin: 0, fontSize: 11 }}>
                  Archived
                </Tag>
              )}
            </Space>
          </Space>
        ),
      },
      {
        title: 'Level',
        dataIndex: 'level',
        key: 'level',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.level || 0) - (b.level || 0),
        render: (level: number) => {
          const colors = ['default', 'blue', 'cyan', 'green', 'gold', 'purple']
          const color = colors[level] || 'blue'
          return <Tag color={color}>Lv {level ?? 0}</Tag>
        },
      },
      {
        title: 'Định nghĩa / Dịch nghĩa',
        key: 'meanings',
        ellipsis: true,
        render: (_: any, record: IItem) => {
          const meanings = record.meanings || []
          if (meanings.length === 0)
            return (
              <Text type='secondary' italic>
                No data
              </Text>
            )
          const first = meanings[0]
          const text = first.definition || first.translation || 'No data'
          const typeLabel = getMeaningTypeLabel(first)
          return (
            <Space direction='vertical' size={2} style={{ maxWidth: '100%' }}>
              {/* <Text ellipsis={{ tooltip: text }}> */}
              <Text
                className={appStyle.inline}
                ellipsis={{ tooltip: <span dangerouslySetInnerHTML={{ __html: text }} /> }}
              >
                {typeLabel ? <b>({typeLabel}) </b> : null}
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </Text>

              {meanings.length > 1 && (
                <Text type='secondary' style={{ fontSize: 11 }}>
                  +{meanings.length - 1} nghĩa khác
                </Text>
              )}
            </Space>
          )
        },
      },
      {
        title: 'Tags',
        dataIndex: 'tags',
        key: 'tags',
        width: 150,
        render: (tags: string[]) => {
          if (!tags || tags.length === 0) return '-'
          return (
            <Space size={[0, 4]} wrap>
              {tags.slice(0, 3).map((t) => (
                <Tag key={t} style={{ fontSize: 11 }}>
                  {t}
                </Tag>
              ))}
              {tags.length > 3 && <Tag style={{ fontSize: 11 }}>+{tags.length - 3}</Tag>}
            </Space>
          )
        },
      },
      {
        title: 'Trạng thái SRS',
        key: 'srs',
        width: 140,
        render: (_: any, record: IItem) => {
          if (!record.next_review_date) {
            return (
              <Text type='secondary' style={{ fontSize: 11 }}>
                Chưa lên lịch
              </Text>
            )
          }
          const isDue = record.next_review_date <= Date.now()
          return (
            <Space direction='vertical' size={0}>
              <Tag color={isDue ? 'warning' : 'success'} style={{ fontSize: 11 }}>
                {isDue ? 'Cần ôn hôm nay' : new Date(record.next_review_date).toLocaleDateString()}
              </Tag>
              {record.interval_days !== undefined && (
                <Text type='secondary' style={{ fontSize: 10 }}>
                  Khoảng: {record.interval_days}d | EF: {record.ease_factor?.toFixed(1) ?? '2.5'}
                </Text>
              )}
            </Space>
          )
        },
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'created_date',
        key: 'created_date',
        width: 140,
        sorter: (a, b) => (a.created_date || 0) - (b.created_date || 0),
        render: (ts?: number) =>
          ts ? (
            <span style={{ fontSize: 12 }}>
              {moment(ts).format(appSetting.dateTimeSecondFormat)}
            </span>
          ) : (
            '-'
          ),
      },
      {
        title: 'Cập nhật',
        dataIndex: 'last_update',
        key: 'last_update',
        width: 140,
        sorter: (a, b) => (a.last_update || 0) - (b.last_update || 0),
        render: (ts?: number) =>
          ts ? (
            <span style={{ fontSize: 12 }}>
              {moment(ts).format(appSetting.dateTimeSecondFormat)}
            </span>
          ) : (
            '-'
          ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 145,
        align: 'center',
        render: (_: any, record: IItem) => (
          <Space size={4}>
            <Tooltip title='Xem chi tiết'>
              <Button size='small' icon={<EyeOutlined />} onClick={() => setSelectedItem(record)} />
            </Tooltip>
            <Tooltip title='Sửa từ vựng'>
              <Button
                size='small'
                icon={<EditOutlined style={{ color: token.colorWarning }} />}
                onClick={() => handleEditItem(record)}
              />
            </Tooltip>
            <Tooltip title={!record.id ? 'Force Delete (Item không có ID)' : 'Xóa từ vựng'}>
              <Button
                size='small'
                danger
                type={!record.id ? 'primary' : 'default'}
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteItem(record, !record.id)}
              />
            </Tooltip>
            <Tooltip title='Xem raw JSON'>
              <Button
                size='small'
                icon={<CodeOutlined />}
                onClick={() => {
                  setIsEditingJson(false)
                  setSelectedRecordJson({ title: record.origin, data: record })
                }}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [token, handleEditItem, handleDeleteItem],
  )

  const blogColumns = useMemo<TableColumnsType<IBlogItem>>(
    () => [
      {
        title: '#',
        key: 'index',
        width: 55,
        align: 'center',
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Tiêu đề',
        dataIndex: 'title',
        key: 'title',
        width: 240,
        ellipsis: true,
        render: (text: string) => (
          <Tooltip title={text || '-'}>
            <Text strong ellipsis style={{ maxWidth: 220, display: 'inline-block' }}>
              {text || '-'}
            </Text>
          </Tooltip>
        ),
      },
      {
        title: 'Mô tả',
        dataIndex: 'description',
        key: 'description',
        width: 320,
        ellipsis: true,
        render: (text: string) => {
          if (!text) return '-'
          const plainText = text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim()
          if (!plainText) return '-'
          const isLong = plainText.length > 90
          const truncated = isLong ? `${plainText.slice(0, 90)}...` : plainText
          return (
            <Tooltip
              title={
                plainText.length > 90
                  ? plainText.length > 400
                    ? `${plainText.slice(0, 400)}...`
                    : plainText
                  : undefined
              }
            >
              <Text type='secondary' ellipsis style={{ maxWidth: 300, display: 'inline-block' }}>
                {truncated}
              </Text>
            </Tooltip>
          )
        },
      },
      {
        title: 'Thẻ (Tags)',
        dataIndex: 'tags',
        key: 'tags',
        width: 180,
        render: (tags: string[]) =>
          tags && tags.length > 0 ? (
            <Space wrap size={[0, 4]}>
              {tags.map((t) => (
                <Tag key={t} color='blue'>
                  {t}
                </Tag>
              ))}
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'created_date',
        key: 'created_date',
        width: 140,
        sorter: (a, b) => (a.created_date || 0) - (b.created_date || 0),
        render: (ts?: number) =>
          ts ? (
            <span style={{ fontSize: 12 }}>
              {moment(ts).format(appSetting.dateTimeSecondFormat)}
            </span>
          ) : (
            '-'
          ),
      },
      {
        title: 'Cập nhật',
        key: 'dates',
        width: 140,
        sorter: (a, b) =>
          (a.last_update || a.created_date || 0) - (b.last_update || b.created_date || 0),
        render: (_: any, record: IBlogItem) => {
          const ts = record.last_update || record.created_date
          return ts ? (
            <span style={{ fontSize: 12 }}>
              {moment(ts).format(appSetting.dateTimeSecondFormat)}
            </span>
          ) : (
            '-'
          )
        },
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 120,
        align: 'center',
        render: (_: any, record: IBlogItem) => (
          <Space size={4}>
            <Tooltip title='Sửa bài viết'>
              <Button
                size='small'
                icon={<EditOutlined style={{ color: token.colorWarning }} />}
                onClick={() => handleEditBlog(record)}
              />
            </Tooltip>
            <Tooltip title='Xóa bài viết'>
              <Button
                size='small'
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteBlog(record)}
              />
            </Tooltip>
            <Tooltip title='Xem raw JSON'>
              <Button
                size='small'
                icon={<CodeOutlined />}
                onClick={() =>
                  setSelectedRecordJson({
                    title: record.title || record.id || 'Blog',
                    data: record,
                  })
                }
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [token, handleEditBlog, handleDeleteBlog],
  )

  const syncMetaColumns = useMemo<TableColumnsType<ISyncMeta>>(
    () => [
      {
        title: 'Khóa (Key)',
        dataIndex: 'key',
        key: 'key',
        width: 280,
        render: (key: string) => <Text code>{key}</Text>,
      },
      {
        title: 'Giá trị (Value)',
        dataIndex: 'value',
        key: 'value',
        render: (val: any, record: ISyncMeta) => {
          if (record.key.startsWith('last_sync_time_') && typeof val === 'number') {
            return (
              <Space>
                <Text strong>{new Date(val).toLocaleString()}</Text>
                <Text type='secondary'>({val})</Text>
              </Space>
            )
          }

          if (typeof val === 'object' && val !== null) {
            const isArr = Array.isArray(val)
            const count = isArr ? val.length : Object.keys(val).length
            let preview = ''
            try {
              preview = JSON.stringify(val)
            } catch {
              preview = '[Không thể serialize Object/Array]'
            }
            const isLong = preview.length > 120
            const displayPreview = isLong ? `${preview.slice(0, 120)}...` : preview

            return (
              <Space align='center' size={8} style={{ maxWidth: '100%' }}>
                <Tag color={isArr ? 'blue' : 'purple'} style={{ margin: 0 }}>
                  {isArr ? `Array [${count}]` : `Object {${count}}`}
                </Tag>
                <Text
                  type='secondary'
                  ellipsis
                  style={{
                    maxWidth: 420,
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                  title={
                    isLong ? `${preview.slice(0, 400)}... (Bấm nút code để xem đầy đủ)` : preview
                  }
                >
                  {displayPreview}
                </Text>
              </Space>
            )
          }

          const strVal = String(val ?? '')
          const isLong = strVal.length > 120
          return (
            <Text
              ellipsis
              style={{ maxWidth: 450 }}
              title={isLong ? `${strVal.slice(0, 300)}...` : strVal}
            >
              {isLong ? `${strVal.slice(0, 120)}...` : strVal}
            </Text>
          )
        },
      },
      {
        title: 'Kiểu dữ liệu',
        key: 'type',
        width: 120,
        render: (_: any, record: ISyncMeta) => <Tag>{typeof record.value}</Tag>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 80,
        align: 'center',
        render: (_: any, record: ISyncMeta) => (
          <Tooltip title='Xem raw JSON'>
            <Button
              size='small'
              icon={<CodeOutlined />}
              onClick={() => setSelectedRecordJson({ title: record.key, data: record })}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  )

  // ================= Firebase Maintenance Handlers =================
  const handleRemoveLegacyFields = async () => {
    setIsRemovingLegacyFields(true)
    setRemoveLegacyFieldsStatus('Starting legacy fields (keywords & origin_lowercase) removal...')
    try {
      const currentUser = user
      if (!currentUser) {
        throw new Error('You must be logged in to modify data.')
      }

      const { removeLegacyFieldsFromFirebaseDb } = await import('@/services/firebase/dbIntegration')
      const result = await removeLegacyFieldsFromFirebaseDb({
        uid: currentUser.uid,
        onProgress: (status) => setRemoveLegacyFieldsStatus(status),
      })

      if (result.isSuccess) {
        message.success(result.message)
        setRemoveLegacyFieldsStatus(result.message)
      } else {
        message.error(result.message)
        setRemoveLegacyFieldsStatus(result.message)
      }
    } catch (error) {
      console.error('Remove legacy fields error:', error)
      message.error(error instanceof Error ? error.message : 'Failed to remove legacy fields')
      setRemoveLegacyFieldsStatus('Failed to remove legacy fields. Check console for details.')
    } finally {
      setIsRemovingLegacyFields(false)
    }
  }

  const handlePurgeDeletedItems = async () => {
    setIsPurging(true)
    setPurgeStatus('Starting purge of soft-deleted items...')
    setPurgedItems([])
    try {
      const currentUser = user
      if (!currentUser) {
        throw new Error('You must be logged in to modify data.')
      }

      const { purgeDeletedItemsFromFirebaseDb } = await import('@/services/firebase/dbIntegration')
      const result = await purgeDeletedItemsFromFirebaseDb({
        uid: purgeOnlyCurrentUser ? currentUser.uid : undefined,
        onProgress: (status) => setPurgeStatus(status),
      })

      if (result.isSuccess) {
        message.success(result.message)
        setPurgeStatus(result.message)
        if (result.deletedItems && result.deletedItems.length > 0) {
          setPurgedItems(result.deletedItems)
          await loadData()
        }
      } else {
        message.error(result.message)
        setPurgeStatus(result.message)
      }
    } catch (error) {
      console.error('Purge deleted items error:', error)
      message.error(error instanceof Error ? error.message : 'Failed to purge soft-deleted items')
      setPurgeStatus('Failed to purge soft-deleted items. Check console for details.')
    } finally {
      setIsPurging(false)
    }
  }

  const confirmPurgeDeletedItems = () => {
    Modal.confirm({
      title: 'Permanently Delete Soft-Deleted Items (is_deleted = true)?',
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: (
        <div>
          <p>
            This action will permanently delete all items from Firebase Firestore where{' '}
            <code>is_deleted = true</code>
            {purgeOnlyCurrentUser ? ' for your account' : ' for ALL users'}.
          </p>
          <p style={{ color: token.colorError, margin: 0, fontWeight: 500 }}>
            This operation cannot be undone!
          </p>
        </div>
      ),
      okText: 'Yes, Purge Items',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handlePurgeDeletedItems(),
    })
  }

  return (
    <div className={appStyle.containerFluid}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space align='center' wrap>
          <PageTitle content='Developer Console' />
          <Tag color='gold'>DEV ONLY</Tag>
          <Tag color='blue'>Enmory LocalDB & Firebase</Tag>
          {user?.email && <Tag color='geekblue'>User: {user.email}</Tag>}
        </Space>

        {mainTab === 'local-db' && (
          <Space wrap>
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData}>
              Refresh
            </Button>
            <Button icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            <Button type='primary' icon={<DownloadOutlined />} onClick={handleDownload}>
              Download JSON
            </Button>
          </Space>
        )}
      </div>

      <Tabs
        activeKey={mainTab}
        onChange={handleTabChange}
        type='card'
        items={[
          {
            key: 'local-db',
            label: (
              <Space>
                <DatabaseOutlined />
                <span>Local Database</span>
              </Space>
            ),
            children: (
              <>
                <Alert
                  message='IndexedDB / Dexie Local Database'
                  description='Dữ liệu hiển thị trực tiếp từ IndexedDB trong trình duyệt của bạn dưới dạng bảng tương tác. Mọi thay đổi trong ứng dụng được đồng bộ tại đây ngay lập tức.'
                  type='info'
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                {/* Summary Statistics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => setActiveTab('items')}
                      style={{
                        borderColor: activeTab === 'items' ? token.colorPrimary : undefined,
                      }}
                    >
                      <Statistic
                        title='Items (Bảng từ vựng)'
                        value={scopedItems.length}
                        prefix={<DatabaseOutlined style={{ color: token.colorPrimary }} />}
                        suffix={
                          searchKeyword && filteredItems.length !== scopedItems.length
                            ? `(${filteredItems.length} tìm thấy)`
                            : filterByUser && user?.uid && scopedItems.length !== items.length
                              ? `(${items.length} toàn bộ)`
                              : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => setActiveTab('blogs')}
                      style={{
                        borderColor: activeTab === 'blogs' ? token.colorSuccess : undefined,
                      }}
                    >
                      <Statistic
                        title='Blogs (Bảng bài viết)'
                        value={scopedBlogs.length}
                        prefix={<CodeOutlined style={{ color: token.colorSuccess }} />}
                        suffix={
                          searchKeyword && filteredBlogs.length !== scopedBlogs.length
                            ? `(${filteredBlogs.length} tìm thấy)`
                            : filterByUser && user?.uid && scopedBlogs.length !== blogs.length
                              ? `(${blogs.length} toàn bộ)`
                              : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => setActiveTab('syncMeta')}
                      style={{
                        borderColor: activeTab === 'syncMeta' ? token.colorWarning : undefined,
                      }}
                    >
                      <Statistic
                        title='Sync Meta (Đồng bộ)'
                        value={syncMeta.length}
                        prefix={<DatabaseOutlined style={{ color: token.colorWarning }} />}
                        suffix={
                          searchKeyword && filteredSyncMeta.length !== syncMeta.length
                            ? `(${filteredSyncMeta.length} tìm thấy)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={24} md={6}>
                    <Card
                      size='small'
                      hoverable
                      onClick={() => setActiveTab('all')}
                      style={{
                        borderColor: activeTab === 'all' ? token.colorInfo : undefined,
                      }}
                    >
                      <Statistic
                        title='Tổng số bản ghi'
                        value={scopedItems.length + scopedBlogs.length + syncMeta.length}
                        prefix={<DatabaseOutlined />}
                        suffix={
                          filterByUser && user?.uid
                            ? `(${items.length + blogs.length + syncMeta.length} toàn bộ)`
                            : ''
                        }
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Controls & Filter */}
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 16]} align='middle' justify='space-between'>
                    <Col xs={24} md={12}>
                      <Tabs
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as TableType)}
                        items={[
                          { key: 'items', label: `items (${scopedItems.length})` },
                          { key: 'blogs', label: `blogs (${scopedBlogs.length})` },
                          { key: 'syncMeta', label: `syncMeta (${syncMeta.length})` },
                          {
                            key: 'all',
                            label: `Tất cả bảng (${scopedItems.length + scopedBlogs.length + syncMeta.length})`,
                          },
                        ]}
                        style={{ marginBottom: 0 }}
                      />
                    </Col>

                    <Col xs={24} md={12}>
                      <Space
                        direction='horizontal'
                        style={{ width: '100%', justifyContent: 'flex-end' }}
                        wrap
                      >
                        {user?.uid && (
                          <Checkbox
                            checked={filterByUser}
                            onChange={(e) => setFilterByUser(e.target.checked)}
                            style={{ userSelect: 'none' }}
                          >
                            <Tooltip
                              title={`Lọc dữ liệu theo tài khoản đang đăng nhập (${user.email || user.uid}). Bỏ chọn để xem toàn bộ dữ liệu trong Local DB.`}
                            >
                              <span>Chỉ tài khoản hiện tại</span>
                            </Tooltip>
                          </Checkbox>
                        )}
                        <Input
                          placeholder='Tìm kiếm trong Local DB...'
                          prefix={<SearchOutlined />}
                          allowClear
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          style={{ width: 260 }}
                        />
                        <Tooltip title='Copy JSON bảng hiện tại'>
                          <Button size='middle' icon={<CopyOutlined />} onClick={handleCopy}>
                            Copy JSON
                          </Button>
                        </Tooltip>
                        <Tooltip title='Tải xuống JSON'>
                          <Button
                            size='middle'
                            icon={<DownloadOutlined />}
                            onClick={handleDownload}
                          >
                            Tải JSON
                          </Button>
                        </Tooltip>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Table Viewer */}
                {loading ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <Spin size='large' children='Đang đọc dữ liệu từ IndexedDB...' />
                    </div>
                  </Card>
                ) : (
                  <>
                    {(activeTab === 'items' || activeTab === 'all') && (
                      <Card
                        title={
                          <Space>
                            <DatabaseOutlined style={{ color: token.colorPrimary }} />
                            <span>Table Items</span>
                            <Tag color='blue'>{filteredItems.length} từ vựng</Tag>
                          </Space>
                        }
                        style={{ marginBottom: activeTab === 'all' ? 24 : 0 }}
                        size='small'
                      >
                        {missingIdItems.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <Alert
                              type='error'
                              showIcon
                              message={
                                <Space
                                  wrap
                                  style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                  <span>
                                    Phát hiện <b>{missingIdItems.length}</b> item bị lỗi thiếu ID
                                    trong Local Database!
                                  </span>
                                  <Button
                                    size='small'
                                    danger
                                    type='primary'
                                    icon={<DeleteOutlined />}
                                    onClick={handleForceDeleteAllMissingIdItems}
                                  >
                                    Force Delete toàn bộ {missingIdItems.length} item lỗi
                                  </Button>
                                </Space>
                              }
                            />
                          </div>
                        )}

                        {selectedRowKeys.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <Alert
                              type='warning'
                              showIcon
                              message={
                                <Space
                                  wrap
                                  style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                  <span>
                                    Đã chọn <b>{selectedRowKeys.length}</b> từ vựng
                                  </span>
                                  <Space>
                                    <Button
                                      size='small'
                                      danger
                                      type='primary'
                                      icon={<DeleteOutlined />}
                                      loading={isBatchDeleting}
                                      onClick={handleBatchDelete}
                                    >
                                      Xóa {selectedRowKeys.length} mục đã chọn
                                    </Button>
                                    <Button
                                      size='small'
                                      onClick={() => setSelectedRowKeys([])}
                                      disabled={isBatchDeleting}
                                    >
                                      Bỏ chọn
                                    </Button>
                                  </Space>
                                </Space>
                              }
                            />
                          </div>
                        )}
                        <Table<IItem>
                          dataSource={filteredItems}
                          columns={itemColumns}
                          rowKey={(record) =>
                            record.id ||
                            `missing_id_${record.origin || ''}_${record.created_date || ''}`
                          }
                          rowSelection={{
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys),
                          }}
                          pagination={{
                            defaultPageSize: 15,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '15', '30', '50', '100'],
                            showTotal: (total, range) =>
                              `${range[0]}-${range[1]} trên tổng số ${total} items`,
                          }}
                          size='small'
                          bordered
                          scroll={{ x: 1150 }}
                        />
                      </Card>
                    )}

                    {(activeTab === 'blogs' || activeTab === 'all') && (
                      <Card
                        title={
                          <Row justify='space-between' align='middle' style={{ width: '100%' }}>
                            <Col>
                              <Space>
                                <CodeOutlined style={{ color: token.colorSuccess }} />
                                <span>Bảng Bài viết (Blogs)</span>
                                <Tag color='green'>
                                  {filteredBlogs.length} bài viết{' '}
                                  {filterByUser && user?.uid ? '(của bạn)' : '(tất cả)'}
                                </Tag>
                              </Space>
                            </Col>
                            <Col>
                              <Space>
                                <Button
                                  size='small'
                                  icon={<SyncOutlined spin={isSyncingBlogs} />}
                                  onClick={handleSyncBlogsFromCloud}
                                  loading={isSyncingBlogs}
                                >
                                  Đồng bộ từ Cloud
                                </Button>
                                <Button
                                  size='small'
                                  type='primary'
                                  icon={<PlusOutlined />}
                                  onClick={() => openBlogModal('add', undefined, loadData)}
                                >
                                  Tạo bài viết
                                </Button>
                              </Space>
                            </Col>
                          </Row>
                        }
                        style={{ marginBottom: activeTab === 'all' ? 24 : 0 }}
                        size='small'
                      >
                        <Table<IBlogItem>
                          dataSource={filteredBlogs}
                          columns={blogColumns}
                          rowKey='id'
                          tableLayout='fixed'
                          pagination={{
                            defaultPageSize: 15,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '15', '30', '50', '100'],
                            showTotal: (total, range) =>
                              `${range[0]}-${range[1]} trên tổng số ${total} blogs`,
                          }}
                          size='small'
                          bordered
                          scroll={{ x: 1200 }}
                        />
                      </Card>
                    )}

                    {(activeTab === 'syncMeta' || activeTab === 'all') && (
                      <Card
                        title={
                          <Space>
                            <DatabaseOutlined style={{ color: token.colorWarning }} />
                            <span>Bảng Sync Meta</span>
                            <Tag color='orange'>{filteredSyncMeta.length} bản ghi cấu hình</Tag>
                          </Space>
                        }
                        size='small'
                      >
                        <Table<ISyncMeta>
                          dataSource={filteredSyncMeta}
                          columns={syncMetaColumns}
                          rowKey='key'
                          pagination={{
                            defaultPageSize: 15,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '15', '30', '50'],
                            showTotal: (total, range) =>
                              `${range[0]}-${range[1]} trên tổng số ${total} meta`,
                          }}
                          size='small'
                          bordered
                          scroll={{ x: 750 }}
                        />
                      </Card>
                    )}
                  </>
                )}

                {/* Modal Chi tiết Item */}
                <Modal
                  title={
                    <Space wrap>
                      <EyeOutlined style={{ color: token.colorPrimary }} />
                      <span>
                        Chi tiết Item: <b>{selectedItem?.origin}</b>
                      </span>
                      {selectedItem?.catId !== undefined && (
                        <Tag color='blue'>{getCategory(selectedItem.catId as ECategory)}</Tag>
                      )}
                      {selectedItem?.level !== undefined && (
                        <Tag color='cyan'>Lv {selectedItem.level}</Tag>
                      )}
                      {selectedItem?.favorite && <StarFilled style={{ color: '#faad14' }} />}
                    </Space>
                  }
                  open={!!selectedItem}
                  onCancel={() => setSelectedItem(null)}
                  width={750}
                  footer={[
                    <Button
                      key='edit'
                      icon={<EditOutlined style={{ color: token.colorWarning }} />}
                      onClick={() => {
                        if (selectedItem) {
                          handleEditItem(selectedItem)
                        }
                      }}
                    >
                      Sửa
                    </Button>,
                    <Button
                      key='delete'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        if (selectedItem) {
                          handleDeleteItem(selectedItem, !selectedItem.id)
                        }
                      }}
                    >
                      {!selectedItem?.id ? 'Force Delete' : 'Xóa'}
                    </Button>,
                    <Button
                      key='copy'
                      icon={<CopyOutlined />}
                      onClick={() => {
                        if (selectedItem) {
                          navigator.clipboard.writeText(JSON.stringify(selectedItem, null, 2))
                          message.success('Đã sao chép JSON của Item!')
                        }
                      }}
                    >
                      Copy JSON
                    </Button>,
                    <Button key='close' type='primary' onClick={() => setSelectedItem(null)}>
                      Đóng
                    </Button>,
                  ]}
                >
                  {selectedItem && (
                    <Tabs
                      defaultActiveKey='formatted'
                      items={[
                        {
                          key: 'formatted',
                          label: 'Thông tin chi tiết',
                          children: (
                            <Space direction='vertical' style={{ width: '100%' }} size={16}>
                              <Descriptions size='small' bordered column={2}>
                                <Descriptions.Item label='ID'>
                                  {selectedItem.id || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='UID'>
                                  {selectedItem.uid || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Loại'>
                                  {selectedItem.catId !== undefined
                                    ? getCategory(selectedItem.catId as ECategory)
                                    : 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Level'>
                                  Level {selectedItem.level ?? 0}
                                </Descriptions.Item>
                                <Descriptions.Item label='Tags' span={2}>
                                  {selectedItem.tags && selectedItem.tags.length > 0
                                    ? selectedItem.tags.map((t) => <Tag key={t}>{t}</Tag>)
                                    : 'None'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Archived'>
                                  {selectedItem.archive ? 'Có' : 'Không'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Yêu thích'>
                                  {selectedItem.favorite ? 'Có' : 'Không'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Ngày tạo'>
                                  {selectedItem.created_date
                                    ? new Date(selectedItem.created_date).toLocaleString()
                                    : 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Cập nhật cuối'>
                                  {selectedItem.last_update
                                    ? new Date(selectedItem.last_update).toLocaleString()
                                    : 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Lịch ôn (SRS)'>
                                  {selectedItem.next_review_date
                                    ? new Date(selectedItem.next_review_date).toLocaleString()
                                    : 'Chưa lên lịch'}
                                </Descriptions.Item>
                                <Descriptions.Item label='Khoảng cách / EF'>
                                  {selectedItem.interval_days ?? 0} ngày | EF:{' '}
                                  {selectedItem.ease_factor?.toFixed(1) ?? '2.5'}
                                </Descriptions.Item>
                              </Descriptions>

                              <div>
                                <h4 style={{ marginBottom: 8 }}>
                                  Nghĩa & Định nghĩa ({selectedItem.meanings?.length || 0}):
                                </h4>
                                {(selectedItem.meanings || []).map((m, idx) => (
                                  <Card key={idx} size='small' style={{ marginBottom: 8 }}>
                                    <Space direction='vertical' style={{ width: '100%' }} size={4}>
                                      <Space wrap>
                                        {getMeaningTypeLabel(m) ? (
                                          <Tag color='purple'>{getMeaningTypeLabel(m)}</Tag>
                                        ) : null}
                                        {m.definition && <Text strong>{m.definition}</Text>}
                                      </Space>
                                      {m.translation && (
                                        <Text type='secondary'>Dịch: {m.translation}</Text>
                                      )}
                                      {m.grammar && (
                                        <Text type='secondary' style={{ fontSize: 12 }}>
                                          Ngữ pháp: {m.grammar}
                                        </Text>
                                      )}
                                      {m.examples && m.examples.length > 0 && (
                                        <div
                                          style={{
                                            marginTop: 6,
                                            paddingLeft: 8,
                                            borderLeft: `2px solid ${token.colorPrimary}`,
                                          }}
                                        >
                                          <Text style={{ fontSize: 12 }} strong>
                                            Ví dụ:
                                          </Text>
                                          {m.examples.map((ex, eIdx) => (
                                            <div key={eIdx} style={{ fontSize: 12, marginTop: 2 }}>
                                              •{' '}
                                              {typeof ex === 'string'
                                                ? ex
                                                : `${ex.origin}${ex.translation ? ` — ${ex.translation}` : ''}`}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </Space>
                                  </Card>
                                ))}
                              </div>
                            </Space>
                          ),
                        },
                        {
                          key: 'json',
                          label: 'Raw JSON',
                          children: (
                            <pre
                              style={{
                                maxHeight: 450,
                                overflow: 'auto',
                                backgroundColor: token.colorBgContainerDisabled || '#1f1f1f',
                                color: token.colorText,
                                padding: 12,
                                borderRadius: 6,
                                fontSize: 12,
                              }}
                            >
                              {JSON.stringify(selectedItem, null, 2)}
                            </pre>
                          ),
                        },
                      ]}
                    />
                  )}
                </Modal>

                {/* Modal Raw JSON cho Record bất kỳ */}
                <Modal
                  title={
                    <Space wrap>
                      <span>Dữ liệu JSON: {selectedRecordJson?.title}</span>
                      {isEditingJson && <Tag color='orange'>Chế độ chỉnh sửa</Tag>}
                      {isHugeRecordJson && (
                        <Tag color='warning'>
                          ~{Math.round(formattedRecordJson.length / 1024)} KB
                        </Tag>
                      )}
                    </Space>
                  }
                  open={!!selectedRecordJson}
                  onCancel={() => {
                    setSelectedRecordJson(null)
                    setIsEditingJson(false)
                    setShowFullJson(false)
                  }}
                  width={750}
                  footer={
                    isEditingJson
                      ? [
                          <Button
                            key='cancel-edit'
                            onClick={() => {
                              setIsEditingJson(false)
                            }}
                          >
                            Hủy
                          </Button>,
                          <Button
                            key='save-edit'
                            type='primary'
                            icon={<SaveOutlined />}
                            onClick={handleSaveJsonEdit}
                          >
                            Lưu JSON
                          </Button>,
                        ]
                      : [
                          <Button
                            key='edit'
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingJsonText(formattedRecordJson)
                              setIsEditingJson(true)
                            }}
                          >
                            Sửa JSON
                          </Button>,
                          <Button
                            key='download'
                            icon={<DownloadOutlined />}
                            onClick={() => {
                              try {
                                const blob = new Blob([formattedRecordJson], {
                                  type: 'application/json',
                                })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `${selectedRecordJson?.title || 'record'}.json`
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                              } catch {
                                message.error('Không thể tạo file tải về')
                              }
                            }}
                          >
                            Tải file JSON
                          </Button>,
                          <Button
                            key='copy'
                            icon={<CopyOutlined />}
                            onClick={() => {
                              if (formattedRecordJson) {
                                navigator.clipboard.writeText(formattedRecordJson)
                                message.success('Đã sao chép JSON!')
                              }
                            }}
                          >
                            Copy JSON
                          </Button>,
                          <Button
                            key='close'
                            type='primary'
                            onClick={() => {
                              setSelectedRecordJson(null)
                              setIsEditingJson(false)
                              setShowFullJson(false)
                            }}
                          >
                            Đóng
                          </Button>,
                        ]
                  }
                >
                  {isEditingJson ? (
                    <>
                      {isHugeRecordJson && (
                        <Alert
                          type='warning'
                          showIcon
                          style={{ marginBottom: 12 }}
                          message='Cảnh báo dữ liệu lớn'
                          description='Dữ liệu này có kích thước rất lớn, chỉnh sửa trực tiếp trong trình duyệt có thể gây giật lag.'
                        />
                      )}
                      <Input.TextArea
                        rows={20}
                        value={editingJsonText}
                        onChange={(e) => setEditingJsonText(e.target.value)}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          backgroundColor: token.colorBgContainerDisabled || '#1f1f1f',
                          color: token.colorText,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {isHugeRecordJson && (
                        <Alert
                          type='warning'
                          showIcon
                          style={{ marginBottom: 12 }}
                          message={`Dữ liệu JSON lớn (~${Math.round(formattedRecordJson.length / 1024)} KB)`}
                          description={
                            <Space direction='vertical' size={4}>
                              <span>
                                {showFullJson
                                  ? 'Đang hiển thị toàn bộ nội dung JSON (có thể gây giật lag).'
                                  : 'Đã giới hạn hiển thị 30,000 ký tự đầu để giao diện luôn mượt mà. Bạn có thể Copy hoặc Tải file JSON về máy.'}
                              </span>
                              <Button size='small' onClick={() => setShowFullJson(!showFullJson)}>
                                {showFullJson ? 'Thu gọn hiển thị' : 'Hiển thị toàn bộ dữ liệu'}
                              </Button>
                            </Space>
                          }
                        />
                      )}
                      <pre
                        style={{
                          maxHeight: 500,
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
                        {isHugeRecordJson && !showFullJson
                          ? `${formattedRecordJson.slice(0, 30000)}\n\n/* ... Đã ẩn ${formattedRecordJson.length - 30000} ký tự còn lại để tối ưu UI ... */`
                          : formattedRecordJson}
                      </pre>
                    </>
                  )}
                </Modal>
              </>
            ),
          },
          {
            key: 'firebase-tools',
            label: (
              <Space>
                <ApiOutlined />
                <span>Firebase DB Integration & Migrations</span>
              </Space>
            ),
            children: (
              <Space direction='vertical' style={{ width: '100%' }} size={16}>
                <Alert
                  message='Firebase Firestore Database Management'
                  description='Run data migrations, cleanup scripts, and deduplication tasks on your remote Firebase Firestore collections.'
                  type='warning'
                  showIcon
                />

                {!user && (
                  <Alert
                    message='Authentication Required'
                    description='You must be logged in to execute Firebase Firestore migration tasks.'
                    type='error'
                    showIcon
                  />
                )}

                {/* 1. Remove Legacy Fields */}
                <Card
                  title={
                    <Space>
                      <DeleteOutlined style={{ color: token.colorError }} />
                      <span>Remove Legacy Fields from Items</span>
                    </Space>
                  }
                  size='small'
                >
                  <Paragraph type='secondary'>
                    Removes obsolete fields (such as <code>keywords</code> and{' '}
                    <code>origin_lowercase</code>) from all items in Firestore to keep documents
                    lean and adhere to current schema standards.
                  </Paragraph>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Button
                      type='default'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleRemoveLegacyFields}
                      loading={isRemovingLegacyFields}
                      disabled={!user}
                    >
                      Remove Legacy Fields (keywords & origin_lowercase)
                    </Button>
                    {removeLegacyFieldsStatus && (
                      <Alert
                        message={removeLegacyFieldsStatus}
                        type={removeLegacyFieldsStatus.includes('Failed') ? 'error' : 'info'}
                        showIcon
                      />
                    )}
                  </Space>
                </Card>

                {/* 2. Purge Soft-Deleted Items (is_deleted = true) */}
                <Card
                  title={
                    <Space>
                      <ClearOutlined style={{ color: token.colorError }} />
                      <span>Permanently Delete Soft-Deleted Items (is_deleted = true)</span>
                    </Space>
                  }
                  size='small'
                >
                  <Paragraph type='secondary'>
                    Scans the Firestore <code>items</code> collection for documents marked as{' '}
                    <code>is_deleted = true</code>, permanently deletes them from Firestore to clean
                    up storage, purges them from local IndexedDB cache, and removes corresponding
                    checklist entries.
                  </Paragraph>
                  <Space direction='vertical' style={{ width: '100%' }} size={12}>
                    <Checkbox
                      checked={purgeOnlyCurrentUser}
                      onChange={(e) => setPurgeOnlyCurrentUser(e.target.checked)}
                    >
                      Only delete items belonging to current user ({user?.email || 'N/A'})
                    </Checkbox>

                    <Button
                      type='primary'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={confirmPurgeDeletedItems}
                      loading={isPurging}
                      disabled={!user}
                    >
                      Purge Soft-Deleted Items (is_deleted = true)
                    </Button>

                    {purgeStatus && (
                      <Alert
                        message={purgeStatus}
                        type={
                          purgeStatus.includes('failed') ||
                          purgeStatus.includes('Error') ||
                          purgeStatus.includes('Failed')
                            ? 'error'
                            : 'info'
                        }
                        showIcon
                      />
                    )}

                    {purgedItems.length > 0 && (
                      <div style={{ marginTop: 12, width: '100%' }}>
                        <h4 style={{ marginBottom: 8, color: token.colorText }}>
                          Permanently Deleted Items ({purgedItems.length}):
                        </h4>
                        <Table
                          dataSource={purgedItems}
                          columns={[
                            {
                              title: 'ID',
                              dataIndex: 'id',
                              key: 'id',
                              width: '25%',
                            },
                            {
                              title: 'Origin',
                              dataIndex: 'origin',
                              key: 'origin',
                              width: '35%',
                            },
                            {
                              title: 'Deleted Date',
                              dataIndex: 'deleted_date',
                              key: 'deleted_date',
                              width: '25%',
                              render: (val?: number) =>
                                val ? new Date(val).toLocaleString() : 'N/A',
                            },
                            {
                              title: 'UID',
                              dataIndex: 'uid',
                              key: 'uid',
                              width: '15%',
                              render: (val?: string) => (val ? `${val.slice(0, 8)}...` : 'N/A'),
                            },
                          ]}
                          rowKey='id'
                          pagination={{ defaultPageSize: 5 }}
                          size='small'
                          bordered
                          scroll={{ x: 750 }}
                        />
                      </div>
                    )}
                  </Space>
                </Card>
              </Space>
            ),
          },
          {
            key: 'gemini-tracker',
            label: (
              <Space>
                <ThunderboltOutlined style={{ color: token.colorPrimary }} />
                <span>Gemini API & Token Usage</span>
                {geminiStats.totalRequests > 0 && (
                  <Tag
                    color='purple'
                    style={{
                      margin: 0,
                      fontSize: 11,
                      borderRadius: 10,
                      padding: '0 6px',
                    }}
                  >
                    {geminiStats.totalRequests} reqs • {geminiStats.totalTokens.toLocaleString()}{' '}
                    token
                  </Tag>
                )}
              </Space>
            ),
            children: <GeminiUsageTab />,
          },
        ]}
      />
    </div>
  )
}

export default Developer

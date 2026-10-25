import appStyle from '@/style/appStyle.module.scss'
import { SyncOutlined, SearchOutlined, CloseCircleOutlined } from '@ant-design/icons'
import {
  useAutoComplete,
  useExampleModal,
  useItemModal,
  useLoading,
  usePrompt,
} from '@/helpers/hooks'
import { exampleApi } from '@/services/firebase/api/example.api'
import {
  theme,
  Button,
  AutoComplete,
  Input,
  Tag,
  Tooltip,
  Flex,
  Space,
  Skeleton,
  Segmented,
  Badge,
} from 'antd'
import { PropsWithChildren, useState, useEffect, useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './example.module.scss'
import { NotFound } from '@/views/components'
import { ExampleItem } from '../exampleItem'
import { useDispatch, useSelector } from '@/core/hooks'
import { exampleAction } from '@/store/reducers/example.reducer'
import { IExample, IItem } from '@/models/item.model'

interface IProps {
  title?: string
}

interface IExampleForm {
  query: string
}

const cleanLabel = (text: string) =>
  text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

export const Example: React.FC<PropsWithChildren & IProps> = () => {
  const { token } = theme.useToken()

  const { user } = useSelector((state) => state.auth)
  const { list: examples, pinnedIds } = useSelector((state) => state.example)

  const [loading, setLoading] = useState<boolean>(false)
  const [activeSearch, setActiveSearch] = useState<string>('')

  // Tab filter: 'all' (Tất cả) vs 'pinned' (Đã ghim)
  const [activeTab, setActiveTab] = useState<'all' | 'pinned'>('all')
  const [pinnedList, setPinnedList] = useState<IExample[]>([])
  const [loadingPinned, setLoadingPinned] = useState<boolean>(false)

  const dispatch = useDispatch()

  const { showLoading, hideLoading } = useLoading()
  const { notification, confirm } = usePrompt()

  const { openExampleModal } = useExampleModal()
  const { openItemModal } = useItemModal()

  const size = user?.configuration?.numberOfExampleReview ?? 10

  // Load pinned IDs for current user on mount or user change
  useEffect(() => {
    dispatch(exampleAction.loadPinnedIds(user?.uid))
  }, [dispatch, user?.uid])

  // Fast O(1) set for pinned check
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds])

  const { control, setValue, handleSubmit, watch } = useForm<IExampleForm>({
    defaultValues: {
      query: '',
    },
  })

  const keyword = watch('query')

  const autoCompleteFilters = useMemo(
    () => ({
      keyword: keyword || '',
    }),
    [keyword],
  )

  const { options } = useAutoComplete(autoCompleteFilters, 'example')

  const formattedOptions = useMemo(() => {
    return (options || []).map((opt) => ({
      ...opt,
      label: cleanLabel(String(opt.label || opt.value || '')),
    }))
  }, [options])

  const onSelect = (option: any) => {
    if (option) {
      const selectedText = cleanLabel(String(option.value || option.label || ''))
      setValue('query', selectedText)
      onSubmit({ query: selectedText })
    }
  }

  const getRandomExamples = useCallback(
    async (number = size, force = false) => {
      if (examples.length > 0 && !force) return

      try {
        setLoading(true)
        setActiveSearch('')
        const { isSuccess, content } = await exampleApi.getRandomExamples(number)
        if (isSuccess && content) {
          dispatch(exampleAction.update(content || []))
        }
      } catch (error) {
        console.error('Error fetching random examples:', error)
      } finally {
        setLoading(false)
      }
    },
    [dispatch, examples.length, size],
  )

  // Fetch pinned examples directly from local DB when pinned tab is active
  const fetchPinnedExamples = useCallback(async () => {
    if (pinnedIds.length === 0) {
      setPinnedList([])
      return
    }

    try {
      setLoadingPinned(true)
      const { isSuccess, content } = await exampleApi.getPinnedExamples(pinnedIds)
      if (isSuccess && content) {
        setPinnedList(content)
      }
    } catch (error) {
      console.error('Error fetching pinned examples:', error)
    } finally {
      setLoadingPinned(false)
    }
  }, [pinnedIds])

  useEffect(() => {
    if (activeTab === 'pinned') {
      fetchPinnedExamples()
    }
  }, [activeTab, fetchPinnedExamples])

  // Keep pinnedList synchronized if any matching example was updated in Redux
  useEffect(() => {
    if (examples.length > 0 && pinnedList.length > 0) {
      const examplesMap = new Map(examples.map((ex) => [ex.id, ex]))
      setPinnedList((prev) =>
        prev.map((pinnedEx) => {
          const match = pinnedEx.id ? examplesMap.get(pinnedEx.id) : null
          return match ? { ...pinnedEx, ...match } : pinnedEx
        }),
      )
    }
  }, [examples])

  const handleTogglePin = useCallback(
    (id: string) => {
      const isNowPinned = !pinnedSet.has(id)
      dispatch(exampleAction.togglePin({ id, uid: user?.uid }))
      if (isNowPinned) {
        notification({ type: 'success', message: 'Đã ghim câu ví dụ' })
      } else {
        notification({ type: 'info', message: 'Đã bỏ ghim câu ví dụ' })
      }
    },
    [dispatch, pinnedSet, user?.uid, notification],
  )

  const handleUnpinAll = useCallback(() => {
    confirm({
      title: 'Bỏ ghim tất cả',
      content: 'Bạn có chắc chắn muốn bỏ ghim toàn bộ các câu ví dụ đã lưu không?',
      onOk: () => {
        dispatch(exampleAction.unpinAll(user?.uid))
        notification({ type: 'success', message: 'Đã bỏ ghim tất cả câu ví dụ' })
      },
    })
  }, [confirm, dispatch, user?.uid, notification])

  const onEdit = async (id: string) => {
    try {
      showLoading()
      const { isSuccess, content } = await exampleApi.getExampleById(id)
      if (isSuccess && content) {
        openExampleModal('edit', content)
      }
    } catch (error: any) {
      notification({ type: 'error', message: error.message })
    } finally {
      hideLoading()
    }
  }

  const onDelete = (id: string) => {
    confirm({
      title: 'Xóa câu ví dụ',
      content: 'Bạn có chắc chắn muốn xóa câu ví dụ này khỏi mục từ không?',
      onOk: async () => {
        try {
          showLoading()
          await exampleApi.deleteExample(id)
          dispatch(exampleAction.remove(id))
          if (pinnedSet.has(id)) {
            dispatch(exampleAction.togglePin({ id, uid: user?.uid }))
          }
          notification({ type: 'success', message: 'Đã xóa câu ví dụ thành công' })
        } catch (error: any) {
          notification({ type: 'error', message: error?.message || 'Lỗi khi xóa câu ví dụ' })
        } finally {
          hideLoading()
        }
      },
    })
  }

  const handleClearSearch = () => {
    setValue('query', '')
    setActiveSearch('')
    getRandomExamples(size, true)
  }

  const onSubmit = async (data: IExampleForm) => {
    const kw = data.query?.trim()
    if (!kw) {
      handleClearSearch()
      return
    }

    try {
      setLoading(true)
      setActiveSearch(kw)
      // Automatically switch to 'all' tab when user searches
      if (activeTab !== 'all') {
        setActiveTab('all')
      }
      const { isSuccess, content } = await exampleApi.getExamples({
        keyword: kw,
        page: 0,
        size: Math.max(size, 20),
      })
      if (isSuccess && content) {
        dispatch(exampleAction.update(content || []))
      }
    } catch (error: any) {
      notification({ type: 'error', message: error?.message || 'Tìm kiếm thất bại' })
    } finally {
      setLoading(false)
    }
  }

  const handleViewItem = (itemId: string) => {
    openItemModal('view', { id: itemId } as IItem)
  }

  // Load once on mount if empty
  useEffect(() => {
    getRandomExamples(size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.exampleOverview}>
      {/* Search & Actions Toolbar */}
      <form
        className={styles.overviewForm}
        onSubmit={handleSubmit(onSubmit)}
        style={{ width: '100%' }}
      >
        <Controller
          control={control}
          name={`query`}
          render={({ field: { onChange, value } }) => {
            return (
              <AutoComplete
                value={value}
                className={styles.autoSearchInput}
                notFoundContent={
                  <NotFound
                    classNames={{ container: 'justify-between' }}
                    label={<span style={{ color: token.colorText }}>Không tìm thấy</span>}
                  />
                }
                children={
                  <Input
                    prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
                    placeholder='Tìm câu ví dụ hoặc từ vựng...'
                    className={styles.searchExampleInput}
                    // allowClear
                    suffix={
                      <CloseCircleOutlined
                        style={{ fontSize: 16, cursor: 'pointer' }}
                        onClick={() => onChange('')}
                      />
                    }
                  />
                }
                filterOption={false}
                options={formattedOptions}
                onSelect={(_, o) => onSelect(o)}
                onChange={(text) => onChange(text)}
              />
            )
          }}
        />

        <Flex gap={4} align='center'>
          <Tooltip title='Tải câu ngẫu nhiên mới'>
            <Button
              icon={<SyncOutlined spin={loading} />}
              onClick={() => {
                setValue('query', '')
                getRandomExamples(size, true)
              }}
            />
          </Tooltip>

          <Button type='primary' htmlType='submit' loading={loading} icon={<SearchOutlined />}>
            <span className={appStyle.fromTablet}>Search</span>
          </Button>
        </Flex>
      </form>

      {/* Tab Filter: Tất cả vs Đã ghim */}
      <Flex
        justify='space-between'
        align='center'
        style={{
          marginBottom: token.size * 0.75,
          marginTop: token.size * 0.25,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Segmented
          options={[
            { label: 'Tất cả câu ví dụ', value: 'all' },
            {
              label: (
                <Space size={6}>
                  <span>Đã ghim</span>
                  {pinnedIds.length > 0 && (
                    <Badge
                      count={pinnedIds.length}
                      overflowCount={99}
                      style={{
                        backgroundColor: token.colorPrimary,
                        fontSize: 11,
                        boxShadow: 'none',
                      }}
                    />
                  )}
                </Space>
              ),
              value: 'pinned',
            },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'all' | 'pinned')}
        />

        {activeTab === 'pinned' && pinnedIds.length > 1 && (
          <Button size='small' type='link' danger onClick={handleUnpinAll} style={{ padding: 0 }}>
            Bỏ ghim tất cả
          </Button>
        )}
      </Flex>

      {/* Content for TAB ALL */}
      {activeTab === 'all' && (
        <>
          {/* Active Search status badge */}
          {activeSearch && (
            <Flex
              justify='space-between'
              align='center'
              style={{ marginBottom: token.size * 0.75, padding: '0 2px' }}
            >
              <Space size={6} wrap>
                <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
                  Kết quả tìm kiếm:
                </span>
                <Tag
                  color='processing'
                  style={{ whiteSpace: 'normal' }}
                  closable
                  onClose={handleClearSearch}
                >
                  {activeSearch}
                </Tag>
                <span style={{ fontSize: 12, color: token.colorTextDescription }}>
                  ({examples.length} câu tìm thấy)
                </span>
              </Space>

              <Button size='small' type='link' onClick={handleClearSearch} style={{ padding: 0 }}>
                Xóa tìm kiếm
              </Button>
            </Flex>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((key) => (
                <div key={key} className={styles.skeletonCard}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && examples?.length === 0 && (
            <NotFound
              showButton={false}
              label={
                activeSearch
                  ? `Không tìm thấy câu ví dụ nào cho "${activeSearch}". Nhấp xóa tìm kiếm để xem các câu khác.`
                  : 'Chưa có câu ví dụ nào! Nhấp vào nút làm mới để tải thêm câu ngẫu nhiên!'
              }
            />
          )}

          {/* Main Example List */}
          {!loading && examples?.length > 0 && (
            <ul
              style={{
                display: 'flex',
                gap: token.size * 0.75,
                flexDirection: 'column',
                padding: 0,
                margin: 0,
                listStyle: 'none',
              }}
            >
              {examples.map((example, key) => (
                <li key={example.id || key}>
                  <ExampleItem
                    data={example}
                    isPinned={example.id ? pinnedSet.has(example.id) : false}
                    onTogglePin={handleTogglePin}
                    onEdit={() => onEdit(example.id || '')}
                    onDelete={() => onDelete(example.id || '')}
                    onViewItem={handleViewItem}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Content for TAB PINNED */}
      {activeTab === 'pinned' && (
        <>
          {/* Loading Skeletons */}
          {loadingPinned && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((key) => (
                <div key={key} className={styles.skeletonCard}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loadingPinned && pinnedList.length === 0 && (
            <NotFound
              showButton={false}
              label='Chưa có câu ví dụ nào được ghim. Nhấn vào biểu tượng ghim ở câu ví dụ bất kỳ để lưu lại tại đây!'
            />
          )}

          {/* Pinned Example List */}
          {!loadingPinned && pinnedList.length > 0 && (
            <ul
              style={{
                display: 'flex',
                gap: token.size * 0.75,
                flexDirection: 'column',
                padding: 0,
                margin: 0,
                listStyle: 'none',
              }}
            >
              {pinnedList.map((pinnedEx, key) => (
                <li key={pinnedEx.id || key}>
                  <ExampleItem
                    data={pinnedEx}
                    isPinned={true}
                    onTogglePin={handleTogglePin}
                    onEdit={() => onEdit(pinnedEx.id || '')}
                    onDelete={() => onDelete(pinnedEx.id || '')}
                    onViewItem={handleViewItem}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

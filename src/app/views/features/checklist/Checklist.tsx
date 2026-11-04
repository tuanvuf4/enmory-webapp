import React, { useState, useMemo, useEffect } from 'react'
import {
  theme,
  Progress,
  Checkbox,
  Button,
  Empty,
  Spin,
  Segmented,
  Tooltip,
  Dropdown,
  Tag,
  Pagination,
  Input,
  Badge,
  Space,
} from 'antd'
import {
  DeleteOutlined,
  ThunderboltFilled,
  ClearOutlined,
  MoreOutlined,
  CheckSquareOutlined,
  UndoOutlined,
  PlayCircleOutlined,
  EditOutlined,
  SearchOutlined,
  FilterOutlined,
  DownOutlined,
} from '@ant-design/icons'
import clsx from 'clsx'
import { useChecklist, useDispatch } from '@/core/hooks'
import { IChecklistItem } from '@/models/checklist.model'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import { getCategory, hasValidMeaning } from '@/helpers/item'
import { itemApi } from '@/services/firebase/api/item.api'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { IOption, IItemQuiz, ECategory } from '@/models/item.model'
import styles from './checklist.module.scss'

type FilterType = 'all' | 'active' | 'completed'

const PAGE_SIZE = 10

export const Checklist: React.FC = () => {
  const { token } = theme.useToken()
  const dispatch = useDispatch()
  const {
    checklist,
    isLoading,
    toggleItem,
    removeItem,
    clearCompleted,
    clearAll,
    setAllCompletion,
  } = useChecklist()
  const { openItemModal } = useItemModal()
  const { message, confirm } = usePrompt()

  const [filter, setFilter] = useState<FilterType>('active')
  const [isPracticing, setIsPracticing] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCat, setSelectedCat] = useState<ECategory>(ECategory.ALL)

  const total = checklist.length
  const completed = checklist.filter((item) => item.isCompleted).length
  const toLearn = total - completed
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    checklist.forEach((item) => {
      const cat = item.catId !== undefined ? Number(item.catId) : ECategory.WORD
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [checklist])

  const categoryList = useMemo(
    () => [
      { label: 'All', value: ECategory.ALL },
      { label: 'Word', value: ECategory.WORD },
      { label: 'Phrase', value: ECategory.PHRASE },
      { label: 'Idiom', value: ECategory.IDIOM },
      { label: 'Slang', value: ECategory.SLANG },
      { label: 'Collocation', value: ECategory.COLLOCATION },
      { label: 'Sentence', value: ECategory.SENTENCE },
    ],
    [],
  )

  const categoryMenuItems = useMemo(() => {
    return categoryList.map((cat) => {
      const count = cat.value === ECategory.ALL ? checklist.length : categoryCounts[cat.value] || 0

      return {
        key: String(cat.value),
        label: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              minWidth: 120,
            }}
          >
            <span>{cat.label}</span>
            <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 500 }}>{count}</span>
          </div>
        ),
      }
    })
  }, [categoryCounts, checklist.length, categoryList])

  // Filter items that have at least one valid definition/translation
  const validChecklist = checklist.filter(hasValidMeaning)

  const handleDelete = async (item: IChecklistItem) => {
    const id = item.checklistId || item.id || ''
    try {
      await removeItem(id)
      message({
        type: 'success',
        content: `Removed "${item.origin}" from checklist!`,
      })
    } catch (error: any) {
      message({
        type: 'error',
        content: error?.message || 'Failed to remove item from checklist',
      })
    }
  }

  const handleStartPractice = async (itemsToPractice?: IChecklistItem[]) => {
    const rawCandidates =
      itemsToPractice && itemsToPractice.length > 0
        ? itemsToPractice
        : filter === 'active'
          ? checklist.filter((i) => !i.isCompleted)
          : filter === 'completed'
            ? checklist.filter((i) => i.isCompleted)
            : toLearn > 0
              ? checklist.filter((i) => !i.isCompleted)
              : checklist

    // Strictly ensure only words with definition/meaning are included in the quiz
    const candidates = rawCandidates.filter(hasValidMeaning)

    if (candidates.length === 0) {
      message({
        type: 'warning',
        content:
          'Chưa có từ nào có định nghĩa hoặc nghĩa trong danh sách. Hãy thêm nghĩa cho từ trước khi luyện tập!',
      })
      return
    }

    setIsPracticing(true)
    try {
      const res = await itemApi.getChecklistStudySet(candidates)
      if (!res.isSuccess || !res.content || res.content.length === 0) {
        message({
          type: 'error',
          content: res.message || 'Failed to generate quiz from checklist items',
        })
        return
      }

      const formattedItems = res.content.map((item) => ({
        ...item,
        quiz: {
          ...item.quiz,
          answer:
            typeof item.quiz.answer === 'string'
              ? item.quiz.answer
              : (item.quiz.answer as IOption<string, boolean>[]).map((ans) => ({
                  ...ans,
                  value: false,
                })),
          result: false,
        },
      })) as unknown as IItemQuiz[]

      dispatch(studySetAction.setList(formattedItems))
      dispatch(
        studySetAction.updateProgress({
          currentIndex: 0,
          inProgress: true,
          isDone: false,
          mode: 'checklist',
        }),
      )

      message({
        type: 'success',
        content: `Started practice quiz with ${formattedItems.length} defined checklist item(s)!`,
      })

      // Smooth scroll to StudySet widget
      const studySet = document.getElementById('studySet')
      if (studySet) {
        studySet.focus()
        const rect = studySet.getBoundingClientRect()
        window.scrollTo({ top: rect.top + window.scrollY - 140, behavior: 'smooth' })
      }
    } catch (err: any) {
      console.error('Error starting checklist practice:', err)
      message({
        type: 'error',
        content: err?.message || 'Failed to start checklist practice',
      })
    } finally {
      setIsPracticing(false)
    }
  }

  const handleClearCompleted = async () => {
    try {
      const res = await clearCompleted()
      if (res.isSuccess) {
        message({
          type: 'success',
          content: res.message || `Cleared ${completed} completed item(s)!`,
        })
      }
    } catch (error: any) {
      message({
        type: 'error',
        content: error?.message || 'Failed to clear completed items',
      })
    }
  }

  const handleClearAll = async () => {
    try {
      const res = await clearAll()
      if (res.isSuccess) {
        message({
          type: 'success',
          content: res.message || 'Cleared all items from checklist!',
        })
      }
    } catch (error: any) {
      message({
        type: 'error',
        content: error?.message || 'Failed to clear checklist',
      })
    }
  }

  const handleSetAllCompletion = async (isCompleted: boolean) => {
    try {
      await setAllCompletion(isCompleted)
      message({
        type: 'success',
        content: isCompleted
          ? 'Marked all items as remembered!'
          : 'Reset all items to uncompleted!',
      })
    } catch (error: any) {
      message({
        type: 'error',
        content: error?.message || 'Failed to update items',
      })
    }
  }

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return checklist.filter((item) => {
      // 1. Completion status filter
      if (filter === 'active' && item.isCompleted) return false
      if (filter === 'completed' && !item.isCompleted) return false

      // 2. Category filter
      if (selectedCat !== ECategory.ALL) {
        const itemCat = item.catId !== undefined ? Number(item.catId) : ECategory.WORD
        if (itemCat !== selectedCat) return false
      }

      // 3. Search query filter
      if (q) {
        const originMatch = (item.origin || '').toLowerCase().includes(q)
        const meaningMatch = (item.meanings || []).some(
          (m) =>
            (m.translation || '').toLowerCase().includes(q) ||
            (m.definition || '').toLowerCase().includes(q),
        )
        return originMatch || meaningMatch
      }

      return true
    })
  }, [checklist, filter, selectedCat, searchQuery])

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, safeCurrentPage])

  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-6'>
        <Spin children='Loading...' />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {total > 0 && (
        <div className={styles.header}>
          {/* Row 1: Remembered progress (Left) & Actions (Right) */}
          <div className={styles.topRow}>
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span className={styles.rememberedText}>
                  <strong>{completed}</strong> / {total} remembered
                </span>
                <span className={styles.percentText}>{percent}%</span>
              </div>

              <Progress
                percent={percent}
                showInfo={false}
                strokeColor={token.colorPrimary}
                trailColor='rgba(255, 255, 255, 0.08)'
                size={['100%', 5]}
                className={styles.progressBar}
              />
            </div>

            <div className={styles.topActions}>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'practice-all',
                      icon: <PlayCircleOutlined />,
                      label: `Practice all defined (${validChecklist.length} items)`,
                      disabled: validChecklist.length === 0,
                      onClick: () => handleStartPractice(validChecklist),
                    },
                    {
                      key: 'mark-all-done',
                      icon: <CheckSquareOutlined />,
                      label: 'Mark all as remembered',
                      disabled: total === 0 || toLearn === 0,
                      onClick: () => handleSetAllCompletion(true),
                    },
                    {
                      key: 'reset-all',
                      icon: <UndoOutlined />,
                      label: 'Reset all to uncompleted',
                      disabled: total === 0 || completed === 0,
                      onClick: () => handleSetAllCompletion(false),
                    },
                    ...(completed > 0
                      ? [
                          { type: 'divider' as const },
                          {
                            key: 'clear-completed',
                            icon: <ClearOutlined />,
                            label: `Clear Done (${completed} items)`,
                            onClick: () => {
                              confirm({
                                title: 'Clear Completed Items?',
                                content: `Remove ${completed} remembered item(s) from your checklist?`,
                                okText: 'Clear',
                                okType: 'danger',
                                onOk: handleClearCompleted,
                              })
                            },
                          },
                        ]
                      : []),
                    { type: 'divider' as const },
                    {
                      key: 'clear-all',
                      icon: <DeleteOutlined />,
                      danger: true,
                      label: 'Clear entire checklist',
                      disabled: total === 0,
                      onClick: () => {
                        confirm({
                          title: 'Clear Entire Checklist?',
                          content: 'Are you sure you want to remove all items from your checklist?',
                          okText: 'Clear All',
                          okType: 'danger',
                          onOk: handleClearAll,
                        })
                      },
                    },
                  ],
                }}
              >
                <Button
                  size={'middle'}
                  type={'default'}
                  icon={<MoreOutlined />}
                  title='More actions'
                />
              </Dropdown>

              <Button
                type='primary'
                icon={<ThunderboltFilled style={{ color: '#ffc107', fontSize: 14 }} />}
                loading={isPracticing}
                disabled={validChecklist.length === 0}
                onClick={() => handleStartPractice()}
              >
                Practice {toLearn > 0 ? `(${toLearn})` : `(${total})`}
              </Button>
            </div>
          </div>

          {/* Row 2: Filter Tabs (Left) & Search + Category Filter (Right) */}
          <div className={styles.filterRow}>
            <Segmented
              size='small'
              className={styles.filterSegmented}
              value={filter}
              onChange={(val) => {
                setFilter(val as FilterType)
                setCurrentPage(1)
              }}
              options={[
                {
                  label: (
                    <Space
                      size={6}
                      align='center'
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <span>All</span>
                      <Badge
                        count={total}
                        showZero
                        overflowCount={999}
                        style={{
                          backgroundColor: token.colorPrimary,
                          color: token.colorWhite,
                          fontSize: 11,
                          lineHeight: '16px',
                          height: 16,
                          minWidth: 16,
                          padding: '0 5px',
                          boxShadow: 'none',
                        }}
                      />
                    </Space>
                  ),
                  value: 'all',
                },
                {
                  label: (
                    <Space
                      size={6}
                      align='center'
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <span>Progress</span>
                      <Badge
                        count={toLearn}
                        showZero
                        overflowCount={999}
                        style={{
                          backgroundColor: token.colorWarning,
                          color: token.colorWhite,
                          fontSize: 11,
                          lineHeight: '16px',
                          height: 16,
                          minWidth: 16,
                          padding: '0 5px',
                          boxShadow: 'none',
                        }}
                      />
                    </Space>
                  ),
                  value: 'active',
                },
                {
                  label: (
                    <Space
                      size={6}
                      align='center'
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <span>Done</span>
                      <Badge
                        count={completed}
                        showZero
                        overflowCount={999}
                        style={{
                          backgroundColor: token.colorSuccess,
                          color: token.colorWhite,
                          fontSize: 11,
                          lineHeight: '16px',
                          height: 16,
                          minWidth: 16,
                          padding: '0 5px',
                          boxShadow: 'none',
                        }}
                      />
                    </Space>
                  ),
                  value: 'completed',
                },
              ]}
            />

            <div className={styles.filterControls}>
              <Input
                className={styles.searchInput}
                prefix={<SearchOutlined className={styles.searchIcon} />}
                placeholder='Search'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                allowClear
              />

              <Dropdown
                trigger={['click']}
                menu={{
                  items: categoryMenuItems,
                  selectedKeys: [String(selectedCat)],
                  onClick: ({ key }) => {
                    setSelectedCat(Number(key))
                    setCurrentPage(1)
                  },
                }}
              >
                <Button
                  className={clsx(selectedCat !== ECategory.ALL && styles.filterCatActive)}
                  icon={<FilterOutlined style={{ fontSize: 13 }} />}
                >
                  <span className={styles.filterCatLabel}>
                    {selectedCat === ECategory.ALL ? 'Category' : getCategory(selectedCat)}
                  </span>
                  <DownOutlined className={styles.filterCatDown} />
                </Button>
              </Dropdown>
            </div>
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              total === 0 ? (
                <span>
                  No items in your checklist yet.
                  <br />
                  Click <b>...</b> on any item card and select <b>Add to checklist</b>.
                </span>
              ) : searchQuery ? (
                <span>No items found matching "{searchQuery}".</span>
              ) : selectedCat !== ECategory.ALL ? (
                <span>No items found in category "{getCategory(selectedCat)}".</span>
              ) : filter === 'active' ? (
                <span>🎉 Great job! You have remembered all items in your checklist.</span>
              ) : (
                <span>No items match the selected filter.</span>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className='flex flex-col gap-2'>
            {paginatedItems.map((item: IChecklistItem) => {
              const id = item.checklistId || item.id || ''
              const hasMeaning = hasValidMeaning(item)
              const quickMeaning =
                item.meanings?.[0]?.translation || item.meanings?.[0]?.definition || ''
              const categoryLabel =
                item.catId !== undefined ? getCategory(item.catId as ECategory) : null

              return (
                <div
                  key={id}
                  className={`${styles.itemCard} ${item.isCompleted ? styles.completed : ''}`}
                  style={{
                    backgroundColor: token.colorBgContainer,
                    borderColor: item.isCompleted ? token.colorBorderSecondary : token.colorBorder,
                  }}
                  onClick={() => openItemModal('view', item)}
                >
                  <div className={styles.itemHeader}>
                    <div className={styles.itemLeft}>
                      <div onClick={(e) => e.stopPropagation()} className='flex items-center'>
                        <Checkbox
                          checked={item.isCompleted}
                          onChange={(e) => toggleItem(id, e.target.checked)}
                        />
                      </div>

                      <div>
                        <div>
                          <span className={styles.wordOrigin} style={{ color: token.colorText }}>
                            {item.origin}
                          </span>

                          {categoryLabel && (
                            <Tag
                              className={styles.categoryTag}
                              color='default'
                              style={{
                                backgroundColor: token.colorFillAlter,
                                borderColor: token.colorBorderSecondary,
                                color: token.colorTextTertiary,
                                marginLeft: 8,
                              }}
                            >
                              {categoryLabel}
                            </Tag>
                          )}
                        </div>
                        <div>
                          {!hasMeaning && (
                            <Tooltip title='This word does not have a definition or Vietnamese meaning, it will not appear in practice exercises.'>
                              <Tag
                                color='warning'
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  padding: '0 4px',
                                  lineHeight: '18px',
                                }}
                              >
                                No Meaning
                              </Tag>
                            </Tooltip>
                          )}

                          {hasMeaning && quickMeaning && (
                            <div
                              className={styles.quickMeaning}
                              style={{ color: token.colorTextSecondary }}
                              title={quickMeaning}
                              dangerouslySetInnerHTML={{ __html: quickMeaning }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title='Edit'>
                        <Button
                          type='text'
                          size='small'
                          icon={<EditOutlined style={{ color: token.palette?.gold?.[7] }} />}
                          onClick={() => openItemModal('edit', item)}
                        />
                      </Tooltip>

                      <Tooltip title='Delete'>
                        <Button
                          type='text'
                          size='small'
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(item)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredItems.length > PAGE_SIZE && (
            <div className={styles.paginationWrapper}>
              <Pagination
                current={safeCurrentPage}
                pageSize={PAGE_SIZE}
                total={filteredItems.length}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                size='small'
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

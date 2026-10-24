import React, { useState } from 'react'
import {
  theme,
  Progress,
  Checkbox,
  Button,
  Empty,
  Spin,
  Segmented,
  Tooltip,
  Popconfirm,
  Dropdown,
  Tag,
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
} from '@ant-design/icons'
import { useChecklist, useDispatch } from '@/core/hooks'
import { IChecklistItem } from '@/models/checklist.model'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import { getCategory, hasValidMeaning } from '@/helpers/item'
import { itemApi } from '@/services/firebase/api/item.api'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { IOption, IItemQuiz, ECategory } from '@/models/item.model'
import styles from './checklist.module.scss'

type FilterType = 'all' | 'active' | 'completed'

export const Checklist: React.FC = () => {
  const { token } = theme.useToken()
  const dispatch = useDispatch()
  const {
    checklist,
    isLoading,
    toggleItem,
    removeItem,
    clearCompleted,
    isClearingCompleted,
    clearAll,
    setAllCompletion,
  } = useChecklist()
  const { openItemModal } = useItemModal()
  const { message, confirm } = usePrompt()

  const [filter, setFilter] = useState<FilterType>('all')
  const [isPracticing, setIsPracticing] = useState<boolean>(false)

  const total = checklist.length
  const completed = checklist.filter((item) => item.isCompleted).length
  const toLearn = total - completed
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  // Filter items that have at least one valid definition/translation
  const validChecklist = checklist.filter(hasValidMeaning)
  const validToLearn = validChecklist.filter((item) => !item.isCompleted).length

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

  const filteredItems = checklist.filter((item) => {
    if (filter === 'active') return !item.isCompleted
    if (filter === 'completed') return item.isCompleted
    return true
  })

  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-6'>
        <Spin tip='Loading...' />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {total > 0 && (
        <div className={styles.header}>
          <div className={styles.statsRow}>
            <span className={styles.statsText} style={{ color: token.colorTextSecondary }}>
              Remembered <b style={{ color: token.colorPrimary }}>{completed}</b> of {total} items
            </span>

            <Segmented
              size='small'
              value={filter}
              onChange={(val) => setFilter(val as FilterType)}
              options={[
                { label: `All (${total})`, value: 'all' },
                { label: `To Learn (${toLearn})`, value: 'active' },
                { label: `Done (${completed})`, value: 'completed' },
              ]}
            />
          </div>

          <Progress
            percent={percent}
            status={percent === 100 ? 'success' : 'active'}
            strokeColor={percent === 100 ? token.colorSuccess : token.colorPrimary}
          />

          {/* Action Bar for Study Set Practice & Cleaning */}
          <div className={styles.actionBar}>
            <Button
              type='primary'
              icon={<ThunderboltFilled />}
              loading={isPracticing}
              disabled={validChecklist.length === 0}
              onClick={() => handleStartPractice()}
              className={styles.practiceBtn}
            >
              Practice ({validToLearn > 0 ? validToLearn : validChecklist.length})
            </Button>

            {completed > 0 && (
              <Popconfirm
                title='Clear Completed Items?'
                description={`Remove ${completed} remembered item(s) from your checklist?`}
                okText='Clear'
                cancelText='Cancel'
                okButtonProps={{ danger: true, loading: isClearingCompleted }}
                onConfirm={handleClearCompleted}
              >
                <Button danger icon={<ClearOutlined />} loading={isClearingCompleted}>
                  Clear Done ({completed})
                </Button>
              </Popconfirm>
            )}

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
                  { type: 'divider' },
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
              <Button icon={<MoreOutlined />} title='More actions' />
            </Dropdown>
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
              ) : filter === 'active' ? (
                <span>🎉 Great job! You have remembered all items in your checklist.</span>
              ) : (
                <span>No items match the selected filter.</span>
              )
            }
          />
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          {filteredItems.map((item: IChecklistItem) => {
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
      )}
    </div>
  )
}

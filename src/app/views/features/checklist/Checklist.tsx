import React, { useState } from 'react'
import { theme, Progress, Checkbox, Button, Empty, Spin, Segmented, Tooltip } from 'antd'
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useChecklist } from '@/core/hooks'
import { IChecklistItem } from '@/models/checklist.model'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import styles from './checklist.module.scss'

type FilterType = 'all' | 'active' | 'completed'

export const Checklist: React.FC = () => {
  const { token } = theme.useToken()
  const { checklist, isLoading, toggleItem, removeItem } = useChecklist()
  const { openItemModal } = useItemModal()
  const { message } = usePrompt()

  const [filter, setFilter] = useState<FilterType>('all')

  const total = checklist.length
  const completed = checklist.filter((item) => item.isCompleted).length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

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

  const filteredItems = checklist.filter((item) => {
    if (filter === 'active') return !item.isCompleted
    if (filter === 'completed') return item.isCompleted
    return true
  })

  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-6'>
        <Spin tip='Loading checklist...' />
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
                { label: `To Learn (${total - completed})`, value: 'active' },
                { label: `Done (${completed})`, value: 'completed' },
              ]}
            />
          </div>

          <Progress
            percent={percent}
            status={percent === 100 ? 'success' : 'active'}
            strokeColor={percent === 100 ? token.colorSuccess : token.colorPrimary}
          />
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

                    <span className={styles.wordOrigin} style={{ color: token.colorText }}>
                      {item.origin}
                    </span>
                  </div>

                  <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title='View'>
                      <Button
                        type='text'
                        size='small'
                        icon={<EyeOutlined />}
                        onClick={() => openItemModal('view', item)}
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

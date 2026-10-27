import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useDispatch, useSelector } from '@/core/hooks'
import { usePrompt } from '@/helpers/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { itemKeys } from '@/core/hooks/useItems'
import { tagApi } from '@/services/firebase'
import { actionAsyncApp } from '@/store/asyncActions'
import { Button, Flex, Input, Popconfirm, Space, Table, theme } from 'antd'
import type { TableProps } from 'antd'
import { useEffect, useMemo, useState } from 'react'

interface ITagRow {
  id: string
  value: string
}

export interface ITagManagerFormProps {
  onClose?: () => void
  onTagUpdated?: (previousValue: string, nextValue: string) => void
  onTagDeleted?: (deletedValue: string) => void
}

export const TagManagerForm: React.FC<ITagManagerFormProps> = ({
  onClose,
  onTagUpdated,
  onTagDeleted,
}) => {
  const { token } = theme.useToken()
  const dispatch = useDispatch()
  const { message } = usePrompt()
  const queryClient = useQueryClient()

  const { tags: allTags } = useSelector((state) => state.setting)

  const [tagKeyword, setTagKeyword] = useState('')
  const [editingTagId, setEditingTagId] = useState<string>('')
  const [editingTagValue, setEditingTagValue] = useState('')
  const [tagSubmitting, setTagSubmitting] = useState(false)

  const tagRows = useMemo<ITagRow[]>(
    () =>
      (allTags || [])
        .map((tag) => ({
          id: String(tag.id || ''),
          value: String(tag.value || '').trim(),
        }))
        .filter((tag) => tag.id && tag.value),
    [allTags],
  )

  const filteredTagRows = useMemo(() => {
    const normalizedKeyword = tagKeyword.trim().toLowerCase()
    if (!normalizedKeyword) return tagRows
    return tagRows.filter((tag) => tag.value.toLowerCase().includes(normalizedKeyword))
  }, [tagKeyword, tagRows])

  const refreshTags = async () => {
    await dispatch(actionAsyncApp.fetchTags() as any)
  }

  useEffect(() => {
    refreshTags()
  }, [])

  const closeAndReset = () => {
    setTagKeyword('')
    setEditingTagId('')
    setEditingTagValue('')
    onClose?.()
  }

  const handleCreateTag = async () => {
    const value = tagKeyword.trim()
    if (!value) {
      message({ type: 'warning', content: 'Please enter tag value' })
      return
    }

    try {
      setTagSubmitting(true)
      const response = await tagApi.createTag(value)
      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to create tag' })
        return
      }

      setTagKeyword('')
      message({ type: 'success', content: 'Tag created successfully' })
      await refreshTags()
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Failed to create tag' })
    } finally {
      setTagSubmitting(false)
    }
  }

  const handleStartEdit = (tag: ITagRow) => {
    setEditingTagId(tag.id)
    setEditingTagValue(tag.value)
  }

  const handleCancelEdit = () => {
    setEditingTagId('')
    setEditingTagValue('')
  }

  const handleSaveTag = async (tag: ITagRow) => {
    const nextValue = editingTagValue.trim()
    if (!nextValue) {
      message({ type: 'warning', content: 'Please enter tag value' })
      return
    }

    try {
      setTagSubmitting(true)
      const response = await tagApi.updateTag(tag.id, nextValue)
      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to update tag' })
        return
      }

      if (tag.value !== nextValue) {
        onTagUpdated?.(tag.value, nextValue)
      }

      message({ type: 'success', content: 'Tag updated successfully' })
      handleCancelEdit()
      await refreshTags()
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Failed to update tag' })
    } finally {
      setTagSubmitting(false)
    }
  }

  const handleDeleteTag = async (tag: ITagRow) => {
    try {
      setTagSubmitting(true)
      const response = await tagApi.deleteTag(tag.id, tag.value)

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to delete tag' })
        return
      }

      onTagDeleted?.(tag.value)

      message({ type: 'success', content: 'Tag deleted successfully' })
      await refreshTags()
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Failed to delete tag' })
    } finally {
      setTagSubmitting(false)
    }
  }

  const tagColumns: TableProps<ITagRow>['columns'] = [
    {
      title: 'Tag',
      key: 'value',
      dataIndex: 'value',
      width: '85%',
      render: (_, record) => {
        const isEditing = editingTagId === record.id

        if (!isEditing) return <span>{record.value}</span>

        return (
          <Input
            value={editingTagValue}
            onChange={(e) => setEditingTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                handleSaveTag(record)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                handleCancelEdit()
              }
            }}
            autoFocus
          />
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'center',
      render: (_, record) => {
        const isEditing = editingTagId === record.id

        if (isEditing) {
          return (
            <Space size='small'>
              <Button
                type='text'
                htmlType='button'
                size='small'
                icon={<CheckOutlined />}
                onClick={() => handleSaveTag(record)}
                loading={tagSubmitting}
                title='Save'
              />
              <Button
                type='text'
                htmlType='button'
                size='small'
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
                title='Cancel'
              />
            </Space>
          )
        }

        return (
          <Space size='small'>
            <Button
              type='text'
              htmlType='button'
              size='small'
              icon={<EditOutlined />}
              onClick={() => handleStartEdit(record)}
              title='Edit'
            />

            <Popconfirm
              title='Delete'
              description='Are you sure you want to delete this tag?'
              onConfirm={() => handleDeleteTag(record)}
              okText='Yes'
              cancelText='No'
            >
              <Button
                type='text'
                htmlType='button'
                size='small'
                icon={<DeleteOutlined />}
                danger
                title='Delete'
              />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <Flex vertical gap={token.size} style={{ marginTop: onClose ? token.size : 0, width: '100%' }}>
      <Flex align='center' gap={token.size / 2}>
        <Input
          placeholder='Search and add new tag...'
          value={tagKeyword}
          onChange={(e) => setTagKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              handleCreateTag()
            }
          }}
          allowClear
        />
        <Button
          type='primary'
          htmlType='button'
          icon={<PlusOutlined />}
          onClick={handleCreateTag}
          loading={tagSubmitting}
        >
          Add
        </Button>
      </Flex>

      <Flex align='center' justify='space-between' wrap='wrap' gap={token.size / 2}>
        <span>Total: {tagRows.length}</span>
      </Flex>

      <div style={{ overflow: 'auto' }}>
        <Table
          columns={tagColumns}
          dataSource={filteredTagRows}
          rowKey='id'
          pagination={
            filteredTagRows.length > 10
              ? { pageSize: 10, size: 'small', showTotal: (total) => `Total ${total} tags` }
              : false
          }
          size='small'
          loading={tagSubmitting}
        />
      </div>

      {onClose && (
        <Flex justify='flex-end' gap={token.size / 2}>
          <Button htmlType='button' onClick={closeAndReset}>
            Close
          </Button>
        </Flex>
      )}
    </Flex>
  )
}

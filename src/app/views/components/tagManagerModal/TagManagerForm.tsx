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
import { ITag, DEFAULT_TAG_COLOR, DEFAULT_TAG_ORDER } from '@/models/tag.model'
import { actionAsyncApp } from '@/store/asyncActions'
import { authAction } from '@/store/reducers/auth.reducer'
import {
  Button,
  ColorPicker,
  Flex,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  theme,
} from 'antd'
import type { TableProps } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'

export interface ITagRow extends ITag {
  id: string
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
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR)
  const [newTagOrder, setNewTagOrder] = useState<number | null>(null)

  const [editingTagId, setEditingTagId] = useState<string>('')
  const [editingTagName, setEditingTagName] = useState('')
  const [editingTagColor, setEditingTagColor] = useState(DEFAULT_TAG_COLOR)
  const [editingTagOrder, setEditingTagOrder] = useState(DEFAULT_TAG_ORDER)
  const [tagSubmitting, setTagSubmitting] = useState(false)

  const tagRows = useMemo<ITagRow[]>(
    () =>
      (allTags || [])
        .map((tag: any) => ({
          id: String(tag.id || tag.name || tag.value || ''),
          name: String(tag.name || tag.label || tag.value || '').trim(),
          value: tag.value !== undefined ? String(tag.value) : '',
          color: tag.color || DEFAULT_TAG_COLOR,
          order: typeof tag.order === 'number' ? tag.order : DEFAULT_TAG_ORDER,
          created_date: tag.created_date,
          last_update: tag.last_update,
        }))
        .filter((tag) => tag.name),
    [allTags],
  )

  const filteredTagRows = useMemo(() => {
    const normalizedKeyword = tagKeyword.trim().toLowerCase()
    const list = !normalizedKeyword
      ? tagRows
      : tagRows.filter((tag) => tag.name.toLowerCase().includes(normalizedKeyword))
    return [...list].sort((a, b) => {
      const diff = (a.order ?? DEFAULT_TAG_ORDER) - (b.order ?? DEFAULT_TAG_ORDER)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })
  }, [tagKeyword, tagRows])

  const refreshTags = async () => {
    const res = await dispatch(actionAsyncApp.fetchTags() as any)
    if (res?.payload?.content) {
      dispatch(authAction.updateItemTags(res.payload.content))
    }
  }

  useEffect(() => {
    refreshTags()
  }, [])

  const closeAndReset = () => {
    setTagKeyword('')
    setEditingTagId('')
    setEditingTagName('')
    setEditingTagColor(DEFAULT_TAG_COLOR)
    setEditingTagOrder(DEFAULT_TAG_ORDER)
    onClose?.()
  }

  const handleCreateTag = async () => {
    const name = tagKeyword.trim()
    if (!name) {
      message({ type: 'warning', content: 'Please enter tag name' })
      return
    }

    try {
      setTagSubmitting(true)
      const nextOrder =
        newTagOrder ?? (tagRows.length > 0 ? Math.max(...tagRows.map((t) => t.order ?? 1)) + 1 : 1)

      const response = await tagApi.createTag({
        name,
        color: newTagColor || DEFAULT_TAG_COLOR,
        order: nextOrder,
        value: '',
      })

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to create tag' })
        return
      }

      setTagKeyword('')
      setNewTagColor(DEFAULT_TAG_COLOR)
      setNewTagOrder(null)
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
    setEditingTagName(tag.name)
    setEditingTagColor(tag.color || DEFAULT_TAG_COLOR)
    setEditingTagOrder(tag.order ?? DEFAULT_TAG_ORDER)
  }

  const handleCancelEdit = () => {
    setEditingTagId('')
    setEditingTagName('')
    setEditingTagColor(DEFAULT_TAG_COLOR)
    setEditingTagOrder(DEFAULT_TAG_ORDER)
  }

  const handleSaveTag = async (tag: ITagRow) => {
    const nextName = editingTagName.trim()
    if (!nextName) {
      message({ type: 'warning', content: 'Please enter tag name' })
      return
    }

    try {
      setTagSubmitting(true)
      const response = await tagApi.updateTag(tag.id, {
        name: nextName,
        color: editingTagColor || DEFAULT_TAG_COLOR,
        order: editingTagOrder,
      })

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to update tag' })
        return
      }

      if (tag.name !== nextName) {
        onTagUpdated?.(tag.name, nextName)
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
      const response = await tagApi.deleteTag(tag.id, tag.name)

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to delete tag' })
        return
      }

      onTagDeleted?.(tag.name)

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
      title: 'Tag Name',
      key: 'name',
      dataIndex: 'name',
      width: '50%',
      render: (_, record) => {
        const isEditing = editingTagId === record.id

        if (!isEditing) {
          return (
            <Tag
              color={record.color || DEFAULT_TAG_COLOR}
              style={{ fontSize: 13, padding: '2px 8px' }}
            >
              {record.name}
            </Tag>
          )
        }

        return (
          <Input
            value={editingTagName}
            onChange={(e) => setEditingTagName(e.target.value)}
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
      title: 'Color',
      key: 'color',
      dataIndex: 'color',
      width: '18%',
      align: 'center',
      render: (_, record) => {
        const isEditing = editingTagId === record.id

        if (!isEditing) {
          return (
            <div
              style={{
                width: 24,
                height: 24,
                backgroundColor: record.color || DEFAULT_TAG_COLOR,
                borderRadius: 4,
                margin: 'auto',
                border: `1px solid ${token.colorBorder}`,
              }}
              title={record.color}
            />
          )
        }

        return (
          <ColorPicker
            value={editingTagColor}
            onChange={(_, hex) => setEditingTagColor(hex)}
            size='small'
          />
        )
      },
    },
    {
      title: 'Order',
      key: 'order',
      dataIndex: 'order',
      width: '16%',
      align: 'center',
      render: (_, record) => {
        const isEditing = editingTagId === record.id

        if (!isEditing) {
          return <span>{record.order ?? DEFAULT_TAG_ORDER}</span>
        }

        return (
          <InputNumber
            min={0}
            size='small'
            value={editingTagOrder}
            onChange={(val) => setEditingTagOrder(val ?? DEFAULT_TAG_ORDER)}
            style={{ width: '100%' }}
          />
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '16%',
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
      {/* Create / Filter bar */}
      <Flex align='center' gap={token.size / 2} wrap='wrap'>
        <Input
          placeholder='Enter tag name to add or filter...'
          value={tagKeyword}
          onChange={(e) => setTagKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              handleCreateTag()
            }
          }}
          style={{ flex: 1, minWidth: 200 }}
          allowClear
        />
        <ColorPicker value={newTagColor} onChange={(_, hex) => setNewTagColor(hex)} />
        <Button
          type='primary'
          htmlType='button'
          icon={<PlusOutlined />}
          onClick={handleCreateTag}
          loading={tagSubmitting}
        >
          Add Tag
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

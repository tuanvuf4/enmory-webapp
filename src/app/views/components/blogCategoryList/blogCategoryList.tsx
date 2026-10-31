import { IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import { useDeleteBlogCategory, useUpdateBlogCategory } from '@/core/hooks/useBlogCategories'
import { DEFAULT_TAG_COLOR, DEFAULT_TAG_ORDER } from '@/models/tag.model'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  theme,
  Empty,
  Input,
  InputNumber,
  ColorPicker,
  Tag,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import type { TableProps } from 'antd'
import { usePrompt } from '@/helpers/hooks'
import React, { useState } from 'react'

export interface BlogCategoryListProps {
  categories: IBlogCategory[]
  isLoading?: boolean
  onEdit?: (category: IBlogCategory) => void
}

export const BlogCategoryList: React.FC<BlogCategoryListProps> = ({
  categories,
  isLoading = false,
  onEdit,
}) => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteBlogCategory()
  const { mutate: updateCategoryMutation, isPending: isUpdating } = useUpdateBlogCategory()

  const [editingCategoryId, setEditingCategoryId] = useState<string>('')
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingCategoryColor, setEditingCategoryColor] = useState(DEFAULT_TAG_COLOR)
  const [editingCategoryOrder, setEditingCategoryOrder] = useState(DEFAULT_TAG_ORDER)

  const handleStartEdit = (cat: IBlogCategory) => {
    setEditingCategoryId(cat.id || cat.name)
    setEditingCategoryName(cat.name)
    setEditingCategoryColor(cat.color || DEFAULT_TAG_COLOR)
    setEditingCategoryOrder(cat.order ?? DEFAULT_TAG_ORDER)
    onEdit?.(cat)
  }

  const handleCancelEdit = () => {
    setEditingCategoryId('')
    setEditingCategoryName('')
    setEditingCategoryColor(DEFAULT_TAG_COLOR)
    setEditingCategoryOrder(DEFAULT_TAG_ORDER)
  }

  const handleSaveEdit = (record: IBlogCategory) => {
    const nextName = editingCategoryName.trim()
    if (!nextName) {
      message({ type: 'warning', content: 'Please enter category name' })
      return
    }

    const targetId = record.id || record.name
    const tagValue = nextName.toLowerCase().replace(/\s+/g, '_')

    updateCategoryMutation(
      {
        id: targetId,
        data: {
          ...record,
          name: nextName,
          color: editingCategoryColor || DEFAULT_TAG_COLOR,
          order: editingCategoryOrder,
          value: tagValue,
        },
      },
      {
        onSuccess: () => {
          message({ type: 'success', content: 'Tag updated successfully' })
          handleCancelEdit()
        },
        onError: (error: any) => {
          message({ type: 'error', content: error?.message || 'Failed to update tag' })
        },
      },
    )
  }

  const handleDelete = (id: string | undefined) => {
    if (!id) return

    deleteCategory(id, {
      onSuccess: () => {
        message({ type: 'success', content: 'Category deleted successfully' })
      },
      onError: (error) => {
        message({ type: 'error', content: 'Failed to delete category' })
        console.error(error)
      },
    })
  }

  const columns: TableProps<IBlogCategory>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '50%',
      render: (text: string, record) => {
        const recordId = record.id || record.name
        const isEditing = editingCategoryId === recordId

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
            value={editingCategoryName}
            onChange={(e) => setEditingCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                handleSaveEdit(record)
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
      dataIndex: 'color',
      key: 'color',
      width: '18%',
      align: 'center',
      render: (_, record) => {
        const recordId = record.id || record.name
        const isEditing = editingCategoryId === recordId

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
            value={editingCategoryColor}
            onChange={(_, hex) => setEditingCategoryColor(hex)}
            size='small'
          />
        )
      },
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: '16%',
      align: 'center',
      render: (_, record) => {
        const recordId = record.id || record.name
        const isEditing = editingCategoryId === recordId

        if (!isEditing) {
          return <span>{record.order ?? DEFAULT_TAG_ORDER}</span>
        }

        return (
          <InputNumber
            min={0}
            size='small'
            value={editingCategoryOrder}
            onChange={(val) => setEditingCategoryOrder(val ?? DEFAULT_TAG_ORDER)}
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
        const recordId = record.id || record.name
        const isEditing = editingCategoryId === recordId

        if (isEditing) {
          return (
            <Space size='small'>
              <Button
                type='text'
                htmlType='button'
                size='small'
                icon={<CheckOutlined />}
                loading={isUpdating}
                onClick={() => handleSaveEdit(record)}
                title='Save'
              />
              <Button
                type='text'
                htmlType='button'
                size='small'
                icon={<CloseOutlined />}
                disabled={isUpdating}
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
              size='small'
              htmlType='button'
              icon={<EditOutlined />}
              onClick={() => handleStartEdit(record)}
              title='Edit'
            />
            <Popconfirm
              title='Delete Tag'
              description='Are you sure you want to delete this tag?'
              onConfirm={() => handleDelete(record.id || record.name)}
              okText='Yes'
              cancelText='No'
            >
              <Button
                type='text'
                size='small'
                htmlType='button'
                icon={<DeleteOutlined />}
                danger
                loading={isDeleting}
                title='Delete'
              />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  if (categories.length === 0 && !isLoading) {
    return <Empty description='No categories found' style={{ marginTop: token.size * 2 }} />
  }

  return (
    <div style={{ overflow: 'auto', width: '100%' }}>
      <Table
        columns={columns}
        style={{ marginTop: token.size, width: '100%' }}
        dataSource={categories}
        rowKey={(record) => record.id || record.name || String(record.order)}
        loading={isLoading || isDeleting}
        pagination={
          categories.length > 5
            ? { pageSize: 5, size: 'small', showTotal: (total) => `Total ${total} categories` }
            : false
        }
        size='small'
        bordered
      />
    </div>
  )
}

export const ArticleCategoryList = BlogCategoryList

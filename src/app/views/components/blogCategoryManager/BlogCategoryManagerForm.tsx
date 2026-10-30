import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useDispatch } from '@/core/hooks'
import { usePrompt } from '@/helpers/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { blogCategoryKeys, useBlogCategories } from '@/core/hooks/useBlogCategories'
import { blogKeys } from '@/core/hooks/useBlogs'
import { blogCategoriesApi, IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import { DEFAULT_TAG_COLOR, DEFAULT_TAG_ORDER } from '@/models/tag.model'
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

export interface IBlogCategoryRow extends IBlogCategory {
  id: string
}

export interface BlogCategoryManagerFormProps {
  onClose?: () => void
  onCategoryUpdated?: (previousValue: string, nextValue: string) => void
  onCategoryDeleted?: (deletedValue: string) => void
  onTagUpdated?: (previousValue: string, nextValue: string) => void
  onTagDeleted?: (deletedValue: string) => void
}

export const BlogCategoryManagerForm: React.FC<BlogCategoryManagerFormProps> = ({
  onClose,
  onCategoryUpdated,
  onCategoryDeleted,
  onTagUpdated,
  onTagDeleted,
}) => {
  const { token } = theme.useToken()
  const dispatch = useDispatch()
  const { message } = usePrompt()
  const queryClient = useQueryClient()

  const { data: allCategories = [], isLoading } = useBlogCategories()

  const [categoryKeyword, setCategoryKeyword] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_TAG_COLOR)
  const [newCategoryOrder, setNewCategoryOrder] = useState<number | null>(null)

  const [editingCategoryId, setEditingCategoryId] = useState<string>('')
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingCategoryColor, setEditingCategoryColor] = useState(DEFAULT_TAG_COLOR)
  const [editingCategoryOrder, setEditingCategoryOrder] = useState(DEFAULT_TAG_ORDER)
  const [categorySubmitting, setCategorySubmitting] = useState(false)

  const categoryRows = useMemo<IBlogCategoryRow[]>(
    () =>
      (allCategories || [])
        .map((cat: any) => ({
          ...cat,
          id: String(cat.id || cat.name || cat.value || ''),
          name: String(cat.name || cat.label || cat.value || '').trim(),
          value: cat.value !== undefined ? String(cat.value) : '',
          color: cat.color || DEFAULT_TAG_COLOR,
          order: typeof cat.order === 'number' ? cat.order : DEFAULT_TAG_ORDER,
          created_date: cat.created_date,
          last_update: cat.last_update,
        }))
        .filter((cat) => cat.name),
    [allCategories],
  )

  const filteredCategoryRows = useMemo(() => {
    const normalizedKeyword = categoryKeyword.trim().toLowerCase()
    const list = !normalizedKeyword
      ? categoryRows
      : categoryRows.filter((cat) => cat.name.toLowerCase().includes(normalizedKeyword))
    return [...list].sort((a, b) => {
      const diff = (a.order ?? DEFAULT_TAG_ORDER) - (b.order ?? DEFAULT_TAG_ORDER)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })
  }, [categoryKeyword, categoryRows])

  const refreshCategories = async () => {
    const res = await blogCategoriesApi.getCategories()
    if (res?.isSuccess && res.content) {
      dispatch(authAction.updateBlogTags(res.content))
    }
    await queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() })
    await queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
  }

  useEffect(() => {
    refreshCategories()
  }, [])

  const closeAndReset = () => {
    setCategoryKeyword('')
    setEditingCategoryId('')
    setEditingCategoryName('')
    setEditingCategoryColor(DEFAULT_TAG_COLOR)
    setEditingCategoryOrder(DEFAULT_TAG_ORDER)
    onClose?.()
  }

  const handleCreateCategory = async () => {
    const name = categoryKeyword.trim()
    if (!name) {
      message({ type: 'warning', content: 'Please enter category name' })
      return
    }

    try {
      setCategorySubmitting(true)
      const nextOrder =
        newCategoryOrder ??
        (categoryRows.length > 0 ? Math.max(...categoryRows.map((c) => c.order ?? 1)) + 1 : 1)

      const categoryValue = name.trim().toLowerCase().replace(/\s+/g, '_')

      const response = await blogCategoriesApi.createCategory({
        name,
        color: newCategoryColor || DEFAULT_TAG_COLOR,
        order: nextOrder,
        value: categoryValue,
      })

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to create category' })
        return
      }

      if (response.message === 'Category already exists') {
        message({ type: 'warning', content: 'Category already exists' })
        return
      }

      setCategoryKeyword('')
      setNewCategoryColor(DEFAULT_TAG_COLOR)
      setNewCategoryOrder(null)
      message({ type: 'success', content: 'Category created successfully' })
      await refreshCategories()
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Failed to create category' })
    } finally {
      setCategorySubmitting(false)
    }
  }

  const handleStartEdit = (cat: IBlogCategoryRow) => {
    setEditingCategoryId(cat.id)
    setEditingCategoryName(cat.name)
    setEditingCategoryColor(cat.color || DEFAULT_TAG_COLOR)
    setEditingCategoryOrder(cat.order ?? DEFAULT_TAG_ORDER)
  }

  const handleCancelEdit = () => {
    setEditingCategoryId('')
    setEditingCategoryName('')
    setEditingCategoryColor(DEFAULT_TAG_COLOR)
    setEditingCategoryOrder(DEFAULT_TAG_ORDER)
  }

  const handleSaveCategory = async (cat: IBlogCategoryRow) => {
    const nextName = editingCategoryName.trim()
    if (!nextName) {
      message({ type: 'warning', content: 'Please enter category name' })
      return
    }

    try {
      setCategorySubmitting(true)
      const targetId = cat.name || cat.id
      const categoryValue = nextName.trim().toLowerCase().replace(/\s+/g, '_')
      const response = await blogCategoriesApi.updateCategory(targetId, {
        name: nextName,
        color: editingCategoryColor || DEFAULT_TAG_COLOR,
        order: editingCategoryOrder,
        value: categoryValue,
      })

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to update category' })
        return
      }

      if (cat.name !== nextName) {
        onCategoryUpdated?.(cat.name, nextName)
        onTagUpdated?.(cat.name, nextName)
      }

      message({ type: 'success', content: 'Category updated successfully' })
      handleCancelEdit()
      await refreshCategories()
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Failed to update category' })
    } finally {
      setCategorySubmitting(false)
    }
  }

  const handleDeleteCategory = async (cat: IBlogCategoryRow) => {
    try {
      setCategorySubmitting(true)
      const targetId = cat.name || cat.id
      const response = await blogCategoriesApi.deleteCategory(targetId)

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to delete category' })
        return
      }

      onCategoryDeleted?.(cat.name)
      onTagDeleted?.(cat.name)

      message({ type: 'success', content: 'Category deleted successfully' })
      await refreshCategories()
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Failed to delete category' })
    } finally {
      setCategorySubmitting(false)
    }
  }

  const categoryColumns: TableProps<IBlogCategoryRow>['columns'] = [
    {
      title: 'Category Name',
      key: 'name',
      dataIndex: 'name',
      width: '50%',
      render: (_, record) => {
        const isEditing = editingCategoryId === record.id

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
                handleSaveCategory(record)
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
        const isEditing = editingCategoryId === record.id

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
      key: 'order',
      dataIndex: 'order',
      width: '16%',
      align: 'center',
      render: (_, record) => {
        const isEditing = editingCategoryId === record.id

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
        const isEditing = editingCategoryId === record.id

        if (isEditing) {
          return (
            <Space size='small'>
              <Button
                type='text'
                htmlType='button'
                size='small'
                icon={<CheckOutlined />}
                onClick={() => handleSaveCategory(record)}
                loading={categorySubmitting}
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
              description='Are you sure you want to delete this category?'
              onConfirm={() => handleDeleteCategory(record)}
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
    <Flex
      vertical
      gap={token.size}
      style={{ marginTop: onClose ? token.size : 0, width: '100%' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Create / Filter bar */}
      <Flex align='center' gap={token.size / 2} wrap='wrap'>
        <Input
          placeholder='Enter category name to add or filter...'
          value={categoryKeyword}
          onChange={(e) => setCategoryKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              handleCreateCategory()
            }
          }}
          style={{ flex: 1, minWidth: 200 }}
          allowClear
        />

        <ColorPicker value={newCategoryColor} onChange={(_, hex) => setNewCategoryColor(hex)} />

        <Button
          type='primary'
          htmlType='button'
          icon={<PlusOutlined />}
          onClick={handleCreateCategory}
          loading={categorySubmitting}
        >
          Add Category
        </Button>
      </Flex>

      <Flex align='center' justify='space-between' wrap='wrap' gap={token.size / 2}>
        <span>Total: {categoryRows.length}</span>
      </Flex>

      <div style={{ overflow: 'auto' }}>
        <Table
          columns={categoryColumns}
          dataSource={filteredCategoryRows}
          rowKey='id'
          pagination={
            filteredCategoryRows.length > 10
              ? { pageSize: 10, size: 'small', showTotal: (total) => `Total ${total} categories` }
              : false
          }
          size='small'
          loading={categorySubmitting || isLoading}
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

export const ArticleCategoryManagerForm = BlogCategoryManagerForm

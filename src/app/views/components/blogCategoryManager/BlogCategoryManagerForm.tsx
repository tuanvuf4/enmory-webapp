import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
import { useBlogCategories } from '@/core/hooks/useBlogCategories'
import { IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import { BlogCategoryList } from '@/views/components/blogCategoryList/blogCategoryList'
import { BlogCategoryForm } from '@/views/features/modals/blogCategoryModal/blogCategoryForm'
import { Button, Card, Flex, Input, theme } from 'antd'
import React, { useMemo, useState } from 'react'

export interface BlogCategoryManagerFormProps {
  onClose?: () => void
}

export const BlogCategoryManagerForm: React.FC<BlogCategoryManagerFormProps> = ({ onClose }) => {
  const { token } = theme.useToken()

  const { data: cats = [], isLoading } = useBlogCategories({
    orderBy: 'created_date',
    order: 'ASC',
  })

  const [searchKeyword, setSearchKeyword] = useState('')
  const [editingCategory, setEditingCategory] = useState<IBlogCategory | undefined>(undefined)
  const [isAdding, setIsAdding] = useState(false)

  const isFormVisible = isAdding || !!editingCategory

  const filteredCategories = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) return cats

    return cats.filter((cat) => {
      const name = (cat.name || '').toLowerCase()
      return name.includes(keyword)
    })
  }, [cats, searchKeyword])

  const handleOpenAdd = () => {
    if (isAdding) {
      setIsAdding(false)
      setEditingCategory(undefined)
    } else {
      setEditingCategory(undefined)
      setIsAdding(true)
    }
  }

  const handleEdit = (category: IBlogCategory) => {
    setIsAdding(false)
    setEditingCategory(category)
  }

  const handleCloseForm = () => {
    setIsAdding(false)
    setEditingCategory(undefined)
  }

  const handleFormSuccess = () => {
    handleCloseForm()
  }

  return (
    <Flex
      vertical
      gap={token.size}
      style={{ width: '100%' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top search & add toolbar */}
      <Flex align='center' gap={token.size / 2} wrap='wrap'>
        <Input
          placeholder='Search categories...'
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          allowClear
          style={{ flex: 1, minWidth: 200 }}
        />
        <Button
          type='primary'
          htmlType='button'
          icon={isFormVisible && isAdding ? <CloseOutlined /> : <PlusOutlined />}
          onClick={handleOpenAdd}
        >
          {isFormVisible && isAdding ? 'Close Form' : 'Add Category'}
        </Button>
      </Flex>

      {/* Inline Category Form Card */}
      {isFormVisible && (
        <Card
          size='small'
          title={
            editingCategory
              ? `Edit Category: ${editingCategory.name}`
              : 'Add New Category'
          }
          extra={
            <Button
              type='text'
              size='small'
              htmlType='button'
              icon={<CloseOutlined />}
              onClick={handleCloseForm}
              title='Close'
            />
          }
          style={{
            borderColor: token.colorPrimaryBorder,
            backgroundColor: token.colorFillAlter,
          }}
        >
          <BlogCategoryForm
            data={editingCategory}
            isInline={true}
            onCancel={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        </Card>
      )}

      {/* Total count */}
      <Flex align='center' justify='space-between' wrap='wrap' gap={token.size / 2}>
        <span style={{ color: token.colorTextSecondary }}>
          Total: {cats.length} {cats.length === 1 ? 'category' : 'categories'}
        </span>
      </Flex>

      {/* Category List Table */}
      <BlogCategoryList
        categories={filteredCategories}
        isLoading={isLoading}
        onEdit={handleEdit}
      />

      {onClose && (
        <Flex justify='flex-end' gap={token.size / 2}>
          <Button htmlType='button' onClick={onClose}>
            Close
          </Button>
        </Flex>
      )}
    </Flex>
  )
}

import { IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import { useDeleteBlogCategory } from '@/core/hooks/useBlogCategories'
import { Table, Button, Space, Popconfirm, theme, Empty } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { TableProps } from 'antd'
import { usePrompt } from '@/helpers/hooks'

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
      width: '55%',
      render: (text: string) => text,
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: '15%',
      align: 'center',
      render: (color: string) => (
        <div
          style={{
            width: 30,
            height: 30,
            backgroundColor: color || '#1890ff',
            borderRadius: 4,
            margin: 'auto',
            border: `1px solid ${token.colorBorder}`,
          }}
          title={color}
        />
      ),
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: '15%',
      align: 'center',
      render: (order?: number) => order ?? 1,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'center',
      render: (_, record) => (
        <Space size='small'>
          <Button
            type='text'
            size='small'
            htmlType='button'
            icon={<EditOutlined />}
            onClick={() => onEdit?.(record)}
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
              title='Delete'
            />
          </Popconfirm>
        </Space>
      ),
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
        // scroll={{ x: 600 }}
        dataSource={categories}
        rowKey='id'
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

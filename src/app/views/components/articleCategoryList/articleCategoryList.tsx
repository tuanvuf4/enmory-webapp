import { IArticleCategory } from '@/services/firebase/api/articleCategories.api'
import { useDeleteArticleCategory } from '@/core/hooks/useArticleCategories'
import { Table, Button, Space, Popconfirm, message, theme, Empty } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { TableProps } from 'antd'
import './articleCategoryList.module.scss'

interface ArticleCategoryListProps {
  categories: IArticleCategory[]
  isLoading?: boolean
  onEdit?: (category: IArticleCategory) => void
}

export const ArticleCategoryList: React.FC<ArticleCategoryListProps> = ({
  categories,
  isLoading = false,
  onEdit,
}) => {
  const { token } = theme.useToken()
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteArticleCategory()

  const handleDelete = (id: string | undefined) => {
    if (!id) return

    deleteCategory(id, {
      onSuccess: () => {
        message.success('Category deleted successfully')
      },
      onError: (error) => {
        message.error('Failed to delete category')
        console.error(error)
      },
    })
  }

  const columns: TableProps<IArticleCategory>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (text: string) => text,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: '10%',
      render: (color: string) => (
        <div
          style={{
            width: 30,
            height: 30,
            backgroundColor: color || '#1890ff',
            borderRadius: 4,
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
      width: '8%',
      align: 'center',
      render: (order: number) => order ?? '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      align: 'center',
      render: (_, record) => (
        <Space size='small'>
          <Button
            type='text'
            size='small'
            icon={<EditOutlined />}
            onClick={() => onEdit?.(record)}
            title='Edit'
          />
          <Popconfirm
            title='Delete Category'
            description='Are you sure you want to delete this category?'
            onConfirm={() => handleDelete(record.id)}
            okText='Yes'
            cancelText='No'
          >
            <Button type='text' size='small' icon={<DeleteOutlined />} danger title='Delete' />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div
      style={{
        backgroundColor: token.colorBgContainer,
        padding: token.size,
        borderRadius: token.borderRadius,
      }}
    >
      {categories.length === 0 && !isLoading ? (
        <Empty description='No categories found' style={{ marginTop: token.size * 2 }} />
      ) : (
        <Table
          columns={columns}
          dataSource={categories}
          rowKey='id'
          loading={isLoading || isDeleting}
          pagination={false}
          size='small'
          bordered
        />
      )}
    </div>
  )
}

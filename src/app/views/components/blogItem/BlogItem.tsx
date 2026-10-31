import { IBlogItem } from '@/models/blog.model'
import { appSetting } from '@/config/index'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { Button, Flex, Popconfirm, Tag, theme, Typography, Space } from 'antd'
import { EditOutlined, CalendarOutlined, ReadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import { usePrompt } from '@/helpers/hooks'
import { useDeleteBlog, useSelector } from '@/core/hooks'

const { Text, Paragraph } = Typography

interface IBlogItemProps extends IBlogItem {
  compact?: boolean
}

export const BlogItem = ({
  id,
  title,
  description,
  created_date,
  last_update,
  relation,
  tags,
  compact = false,
}: IBlogItemProps) => {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { openBlogModal } = useBlogModal()
  const { message } = usePrompt()
  const { mutateAsync: deleteBlogMutation, isPending: isDeleting } = useDeleteBlog()

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteBlogMutation(id)
      message({
        type: 'success',
        content: 'Blog post deleted successfully',
      })
    } catch (error: any) {
      message({
        type: 'error',
        content: error?.message || 'Failed to delete blog post',
      })
    }
  }

  const preview = description.length > 200 ? `${description.substring(0, 200)}...` : description

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/blog?tag=${encodeURIComponent(tag)}`)
  }

  const { user } = useSelector((state) => state.auth)
  const cats = user?.configuration?.blogTags || []

  const getSelectedTagName = (tag: string) => {
    return cats.find((i) => i.value === tag)?.name
  }

  if (compact) {
    return (
      <Flex justify='space-between' align='flex-start' gap={token.sizeSM} style={{ width: '100%' }}>
        {/* Main content */}
        <Flex vertical gap={token.sizeXS} style={{ flex: 1, minWidth: 0 }}>
          <Flex align='center' gap={token.sizeXS}>
            <CalendarOutlined
              style={{ color: token.colorTextTertiary, fontSize: token.fontSizeSM }}
            />
            <Text type='secondary' style={{ fontSize: token.fontSizeSM }}>
              {moment(created_date).format(appSetting.dateTimeFormat)}
            </Text>
          </Flex>

          <Text
            strong
            className='cursor-pointer'
            style={{ fontSize: token.fontSizeLG, lineHeight: 1.4 }}
            onClick={() => navigate(`/blog?id=${id}`)}
          >
            {title}
          </Text>

          {tags && tags.length > 0 && (
            <Space size={4} wrap>
              {tags.slice(0, 4).map((tag) => (
                <Tag
                  key={tag}
                  className='cursor-pointer'
                  style={{ margin: 0, fontSize: token.fontSizeSM }}
                  onClick={(e) => handleTagClick(tag, e)}
                >
                  {tag}
                </Tag>
              ))}
              {tags.length > 4 && (
                <Text type='secondary' style={{ fontSize: token.fontSizeSM }}>
                  +{tags.length - 4}
                </Text>
              )}
            </Space>
          )}
        </Flex>

        {/* Actions */}
        <Flex gap={token.sizeXS} align='center' flex='none'>
          <Button size='small' icon={<ReadOutlined />} onClick={() => navigate(`/blog?id=${id}`)}>
            Read
          </Button>
          <Button
            size='small'
            variant='text'
            icon={<EditOutlined />}
            onClick={() =>
              openBlogModal('edit', {
                id,
                title,
                description,
                created_date,
                last_update,
                relation,
                tags,
              })
            }
          />
          <Popconfirm
            title='Delete post'
            description='Are you sure you want to delete this blog post?'
            onConfirm={handleDelete}
            okText='Yes'
            cancelText='No'
          >
            <Button
              size='small'
              variant='text'
              icon={<DeleteOutlined />}
              danger
              loading={isDeleting}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex vertical justify='space-between' style={{ height: '100%' }} gap={token.sizeSM}>
      {/* Header */}
      <Flex justify='space-between' align='flex-start' gap={8}>
        <Text
          strong
          className='cursor-pointer'
          style={{ fontSize: token.fontSizeLG, lineHeight: 1.4, flex: 1 }}
          onClick={() => navigate(`/blog?id=${id}`)}
        >
          {title}
        </Text>
        <Flex gap={token.sizeXXS} align='center' style={{ flexShrink: 0 }}>
          <Button
            variant='text'
            icon={<EditOutlined />}
            size='small'
            onClick={() =>
              openBlogModal('edit', {
                id,
                title,
                description,
                created_date,
                last_update,
                relation,
                tags,
              })
            }
          />
          <Popconfirm
            title='Delete post'
            description='Are you sure you want to delete this blog post?'
            onConfirm={handleDelete}
            okText='Yes'
            cancelText='No'
          >
            <Button
              variant='text'
              icon={<DeleteOutlined />}
              size='small'
              danger
              loading={isDeleting}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Flex>
      </Flex>

      {/* Date */}
      <Flex align='center' gap={token.sizeXS}>
        <CalendarOutlined style={{ color: token.colorTextTertiary, fontSize: token.fontSizeSM }} />
        <Text type='secondary' style={{ fontSize: token.fontSizeSM }} className='italic'>
          {moment(created_date).format(appSetting.dateTimeFormat)}
        </Text>
      </Flex>

      {/* Description preview */}
      <Paragraph
        style={{ flex: 1, margin: 0, color: token.colorTextSecondary }}
        ellipsis={{ rows: 3 }}
      >
        <span dangerouslySetInnerHTML={{ __html: preview }} />
      </Paragraph>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <Space size={4} wrap>
          {tags.slice(0, 4).map((tag) => (
            <Tag
              key={tag}
              className='cursor-pointer'
              style={{ margin: 0, fontSize: token.fontSizeSM }}
              onClick={(e) => handleTagClick(tag, e)}
            >
              {getSelectedTagName(tag)}
            </Tag>
          ))}
          {tags.length > 4 && (
            <Text type='secondary' style={{ fontSize: token.fontSizeSM }}>
              +{tags.length - 4}
            </Text>
          )}
        </Space>
      )}

      {/* Footer */}
      <div>
        <Button
          icon={<ReadOutlined />}
          variant='outlined'
          type='default'
          onClick={() => navigate(`/blog?id=${id}`)}
        >
          Read more
        </Button>
      </div>
    </Flex>
  )
}

export const ArticleItem = BlogItem

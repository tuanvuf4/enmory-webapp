import React, { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { NotFound, PageTitle, Tags } from '@/views/components'
import appStyle from '@/style/appStyle.module.scss'
import { useBlog, useDeleteBlog, useSelector } from '@/core/hooks'
import { Button, Flex, Popconfirm, Spin, theme } from 'antd'
import { appSetting } from '@/config/appConfig'
import moment from 'moment'
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import { usePrompt } from '@/helpers/hooks'
import clsx from 'clsx'
import { Widget } from '@/views/features/widget/Widget'

export interface BlogDetailProps {
  id?: string
}

export const BlogDetail: React.FC<BlogDetailProps> = ({ id: propId }) => {
  const params = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const { token } = theme.useToken()
  const { openBlogModal } = useBlogModal()
  const { message } = usePrompt()
  const { mutateAsync: deleteBlogMutation, isPending: isDeleting } = useDeleteBlog()

  const { user } = useSelector((state) => state.auth)
  const tags = user?.configuration?.blogTags || []

  // Redirect legacy /blog/:id to /blog?id=:id
  useEffect(() => {
    if (params.id) {
      navigate(`/blog?id=${params.id}`, { replace: true })
    }
  }, [params.id, navigate])

  const id = propId || searchParams.get('id') || params.id

  const { data: blog, isLoading } = useBlog(id || '', !!id)

  const getTagName = (tag: string) => {
    const item = tags.find((i) => i.value === tag)
    if (item) return item.name
    return ''
  }

  const handleBack = () => {
    if (searchParams.has('id')) {
      const next = new URLSearchParams(searchParams)
      next.delete('id')
      const searchStr = next.toString()
      navigate(`/blog${searchStr ? `?${searchStr}` : ''}`)
    } else {
      navigate('/blog')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteBlogMutation(id)
      message({
        type: 'success',
        content: 'Blog post deleted successfully',
      })
      handleBack()
    } catch (error: any) {
      message({
        type: 'error',
        content: error?.message || 'Failed to delete blog post',
      })
    }
  }

  return (
    <div className={clsx(appStyle.contentPage, appStyle.containerMd)}>
      <Button type='text' icon={<ArrowLeftOutlined />} onClick={handleBack} className='!mb-3'>
        Back to blogs
      </Button>

      <Spin spinning={isLoading} style={{ width: '100%' }}>
        {blog ? (
          <>
            <PageTitle content={blog?.title || 'Blog detail'} />

            <Flex justify={'space-between'} align={'center'} gap={token.size} className={'!mb-4'}>
              <i className={'text-xs'}>
                {`Posted on: `}
                {blog?.created_date
                  ? moment(blog.created_date).format(appSetting.dateTimeFormat)
                  : ''}
              </i>

              <Flex gap={token.sizeXS} align='center'>
                <Button
                  variant={'text'}
                  type={'default'}
                  icon={<EditOutlined />}
                  onClick={() => {
                    openBlogModal('edit', { ...blog })
                  }}
                >
                  Edit
                </Button>

                <Popconfirm
                  title='Delete post'
                  description='Are you sure you want to delete this blog post?'
                  onConfirm={handleDelete}
                  okText='Yes'
                  cancelText='No'
                >
                  <Button variant='text' icon={<DeleteOutlined />} danger loading={isDeleting}>
                    Delete
                  </Button>
                </Popconfirm>
              </Flex>
            </Flex>

            <Widget>
              {((blog.tags && blog.tags.length > 0) ||
                (blog.relation && blog.relation.length > 0)) && (
                <div
                  style={{
                    marginBottom: token.size,
                    borderBottom: `1px solid ${token.colorBorder}`,
                    paddingTop: token.size,
                    paddingBottom: token.size,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: token.size / 2,
                  }}
                >
                  {blog.tags && blog.tags.length > 0 && (
                    <Tags
                      label={'Tags'}
                      tags={blog.tags.map((t) => getTagName(t))}
                      searchBy={'tags'}
                      onTagClick={(tag) => navigate(`/blog?tag=${encodeURIComponent(tag)}`)}
                    />
                  )}
                  {blog.relation && blog.relation.length > 0 && (
                    <Tags label={'Relation'} tags={blog.relation} />
                  )}
                </div>
              )}

              <div
                className={clsx(appStyle.blog, appStyle.article)}
                dangerouslySetInnerHTML={{ __html: blog.description || '' }}
              />
            </Widget>
          </>
        ) : (
          !isLoading && (
            <div className='flex items-center justify-center p-4' style={{ minHeight: 400 }}>
              <NotFound
                label={<h2 className='m-0'>Blog post not found</h2>}
                button={
                  <Button type='primary' onClick={handleBack}>
                    Back to blogs
                  </Button>
                }
              />
            </div>
          )
        )}
      </Spin>
    </div>
  )
}

export default BlogDetail

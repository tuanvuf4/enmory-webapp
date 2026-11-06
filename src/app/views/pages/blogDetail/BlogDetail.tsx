import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { NotFound, PageTitle, Tags } from '@/views/components'
import appStyle from '@/style/appStyle.module.scss'
import { useBlog, useDeleteBlog, useUpdateBlog, useSelector } from '@/core/hooks'
import { Button, Flex, Popconfirm, Spin, theme, Segmented, Row, Col } from 'antd'
import { appSetting } from '@/config/appConfig'
import moment from 'moment'
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import { usePrompt } from '@/helpers/hooks'
import clsx from 'clsx'
import { Widget } from '@/views/features/widget/Widget'
import { VocabClassificationTabs } from '@/views/features/vocabClassification'
import { IClassifiedVocabItem } from '@/models/vocabClassification.model'
import { formatBlogCategoryValue } from '@/services/firebase/api/blogCategories.api'

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
  const { mutateAsync: updateBlogMutation } = useUpdateBlog()

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
  const [viewMode, setViewMode] = useState<'original' | 'bilingual' | 'translation'>('original')

  // Align paragraphs for 1:1 bilingual comparison
  const paragraphPairs = useMemo(() => {
    if (!blog?.description || !blog?.translation) return null
    if (typeof document === 'undefined') return null

    try {
      const parser = new DOMParser()
      const origDoc = parser.parseFromString(blog.description, 'text/html')
      const transDoc = parser.parseFromString(blog.translation, 'text/html')

      const origBlocks = Array.from(origDoc.body.children).map((c) => c.outerHTML)
      const transBlocks = Array.from(transDoc.body.children).map((c) => c.outerHTML)

      if (origBlocks.length > 0 && origBlocks.length === transBlocks.length) {
        return origBlocks.map((orig, i) => ({
          original: orig,
          translation: transBlocks[i],
        }))
      }
    } catch {
      // fallback
    }

    return null
  }, [blog?.description, blog?.translation])

  const getTagName = (tag: string) => {
    const normalizedTarget = formatBlogCategoryValue(tag)
    const item = tags.find(
      (i) =>
        i.value === tag ||
        i.name === tag ||
        formatBlogCategoryValue(i.value) === normalizedTarget ||
        formatBlogCategoryValue(i.name) === normalizedTarget,
    )
    if (item) return item.name
    return tag
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

  const handleSaveClassification = async (items: IClassifiedVocabItem[]) => {
    if (!blog?.id) return
    try {
      await updateBlogMutation({
        id: blog.id,
        data: {
          ...blog,
          vocabClassification: items,
        },
      })
    } catch (err: any) {
      console.warn('[BlogDetail] Failed to save vocab classification:', err)
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

              <Flex vertical gap={token.size}>
                {/* Classification of blog content into words, phrases, collocations by difficulty A1 -> C2 */}
                <VocabClassificationTabs
                  contentId={blog.id}
                  content={blog.description || ''}
                  contentType='blog'
                  title={blog.title}
                  translation={blog.translation}
                  initialItems={blog.vocabClassification}
                  onSave={handleSaveClassification}
                />

                {/* View mode switcher if translation is available */}
                {blog.description && blog.translation && (
                  <Segmented
                    size='small'
                    value={viewMode}
                    onChange={(val) => setViewMode(val as 'original' | 'bilingual' | 'translation')}
                    options={[
                      { label: 'Bài gốc', value: 'original' },
                      { label: 'Song ngữ', value: 'bilingual' },
                      { label: 'Bản dịch', value: 'translation' },
                    ]}
                    style={{ alignSelf: 'flex-start' }}
                  />
                )}

                {viewMode === 'bilingual' && blog.translation ? (
                  <>
                    {paragraphPairs ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16,
                        }}
                      >
                        {paragraphPairs.map((pair, idx) => (
                          <Row
                            key={idx}
                            gutter={token.size}
                            style={{
                              padding: '12px 4px',
                              borderRadius: 8,
                              background: token.colorFillAlter,
                            }}
                          >
                            <Col xs={24} lg={12}>
                              <div
                                className={clsx(appStyle.blog, appStyle.article)}
                                dangerouslySetInnerHTML={{ __html: pair.original }}
                              />
                            </Col>
                            <Col xs={24} lg={12}>
                              <div
                                className={clsx(appStyle.blog, appStyle.article)}
                                style={{
                                  color: token.colorTextSecondary,
                                  background: token.colorBgContainer,
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  borderLeft: `3px solid ${token.colorSuccess}`,
                                }}
                                dangerouslySetInnerHTML={{ __html: pair.translation }}
                              />
                            </Col>
                          </Row>
                        ))}
                      </div>
                    ) : (
                      <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              marginBottom: 8,
                              color: token.colorPrimary,
                            }}
                          >
                            🇺🇸 Bài viết gốc
                          </div>
                          <div
                            className={clsx(appStyle.blog, appStyle.article)}
                            dangerouslySetInnerHTML={{ __html: blog.description || '' }}
                          />
                        </Col>
                        <Col xs={24} lg={12}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              marginBottom: 8,
                              color: token.colorSuccess,
                            }}
                          >
                            🇻🇳 Bản dịch tiếng Việt
                          </div>
                          <div
                            className={clsx(appStyle.blog, appStyle.article)}
                            dangerouslySetInnerHTML={{ __html: blog.translation }}
                          />
                        </Col>
                      </Row>
                    )}
                  </>
                ) : viewMode === 'translation' && blog.translation ? (
                  <div
                    className={clsx(appStyle.blog, appStyle.article)}
                    dangerouslySetInnerHTML={{ __html: blog.translation }}
                  />
                ) : (
                  <div
                    className={clsx(appStyle.blog, appStyle.article)}
                    dangerouslySetInnerHTML={{ __html: blog.description || '' }}
                  />
                )}
              </Flex>
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

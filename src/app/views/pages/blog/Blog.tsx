import { CloseCircleOutlined, PlusOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons'
import {
  Badge,
  Button,
  Col,
  Flex,
  Input,
  Modal,
  Pagination,
  Row,
  Space,
  Spin,
  Tag,
  theme,
  Tooltip,
} from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useBlogs, useBlogsCount, useDebounce, useSelector } from '@/core/hooks'
import { usePrompt } from '@/helpers/hooks'
import { useBlogCategoryModal } from '@/helpers/hooks/useBlogCategoryModal'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import { IBlogCategory, formatBlogCategoryValue } from '@/services/firebase/api/blogCategories.api'
import appStyle from '@/style/appStyle.module.scss'
import { NotFound, PageTitle } from '@/views/components'
import { BlogTagList } from '@/views/components/blogTagList/BlogTagList'
import { BlogItem } from '@/views/components/blogItem/BlogItem'
import { BlogDetail } from '@/views/pages/blogDetail/BlogDetail'
import { Widget } from '@/views/features/widget/Widget'

const { CheckableTag } = Tag

const PAGE_SIZE = 10

export const Blog = () => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState(0)
  const selectedTag = searchParams.get('tag') || undefined
  const initialKeyword = searchParams.get('keyword') || searchParams.get('q') || ''
  const [searchInput, setSearchInput] = useState(initialKeyword)
  const debouncedKeyword = useDebounce(searchInput.trim(), 300)
  const blogId = searchParams.get('id') || undefined
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const { openBlogModal } = useBlogModal()
  const { openBlogCategoryModal } = useBlogCategoryModal()

  // Sync search input if URL query param changes externally
  useEffect(() => {
    const urlKw = searchParams.get('keyword') || searchParams.get('q') || ''
    if (urlKw !== searchInput && urlKw !== debouncedKeyword) {
      setSearchInput(urlKw)
    }
  }, [searchParams])

  // Sync debounced keyword to URL search params & reset page
  useEffect(() => {
    setPage(0)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (debouncedKeyword) {
          next.set('keyword', debouncedKeyword)
          next.delete('q')
        } else {
          next.delete('keyword')
          next.delete('q')
        }
        return next
      },
      { replace: true },
    )
  }, [debouncedKeyword])

  const {
    data: blogs = [],
    isLoading: isLoadingBlogs,
    error: blogsError,
  } = useBlogs(
    {
      page,
      size: PAGE_SIZE,
      tag: selectedTag,
      keyword: debouncedKeyword || undefined,
      orderBy: 'created_date',
      order: 'DESC',
    },
    !blogId,
  )

  const { data: totalCount = 0 } = useBlogsCount(
    selectedTag,
    debouncedKeyword || undefined,
    !blogId,
  )

  const { user } = useSelector((state) => state.auth)
  const cats = user?.configuration?.blogTags || []
  const selectedTagName = cats.find((i) => i.value === selectedTag)?.name

  useEffect(() => {
    if (blogsError) {
      message({
        type: 'error',
        content: (blogsError as Error)?.message || 'Failed to load blog posts',
      })
    }
  }, [blogsError])

  useEffect(() => {
    setPage(0)
  }, [selectedTag])

  const handleAddCategory = () => {
    openBlogCategoryModal('add', {} as IBlogCategory)
  }

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false)
  }

  const handleSelectTag = (tag?: string) => {
    setPage(0)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tag) {
        next.set('tag', tag)
      } else {
        next.delete('tag')
      }
      return next
    })
  }

  const getCatValue = (cat: { name: string; value?: string }) => {
    return cat.value || formatBlogCategoryValue(cat.name) || cat.name
  }

  const isCatChecked = (cat: { name: string; value?: string }) => {
    if (!selectedTag) return false
    const catVal = getCatValue(cat)
    const s = selectedTag.trim().toLowerCase()
    const sFormatted = formatBlogCategoryValue(selectedTag)
    return (
      s === catVal.toLowerCase() ||
      s === cat.name.trim().toLowerCase() ||
      s === (cat.value || '').trim().toLowerCase() ||
      s === formatBlogCategoryValue(cat.name) ||
      s === cat.name.trim().toLowerCase().replace(/\s+/g, '_') ||
      sFormatted === (cat.value || '').trim().toLowerCase() ||
      sFormatted === formatBlogCategoryValue(cat.name)
    )
  }

  if (blogId) {
    return <BlogDetail id={blogId} />
  }

  const colSpan = false
    ? { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 }
    : { xs: 24, sm: 24, md: 12, lg: 12, xl: 12 }

  return (
    <>
      <div className={appStyle.containerMd}>
        <PageTitle content='Blog' />

        <Space size={token.size} direction='vertical' style={{ width: '100%' }}>
          {/* Toolbar */}
          <Flex justify='space-between' align='center' gap={token.sizeSM} wrap='wrap'>
            {/* Left actions */}
            <Flex align='center' gap={token.sizeSM} wrap='wrap' style={{ flex: 1, minWidth: 260 }}>
              <Tooltip title='New post'>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() =>
                    openBlogModal('add', {
                      description: '',
                      title: '',
                      relation: [],
                      tags: selectedTag ? [selectedTag] : [],
                    })
                  }
                >
                  New
                </Button>
              </Tooltip>

              <Tooltip title='Blog tags'>
                <Button icon={<TagsOutlined />} onClick={() => setShowCategoryModal(true)}>
                  Tags
                </Button>
              </Tooltip>
            </Flex>

            {/* Right: view toggle + post count */}
            <Flex align='center' gap={token.sizeSM}>
              <Input
                placeholder='Tìm kiếm bài viết...'
                prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                suffix={
                  <CloseCircleOutlined
                    style={{ fontSize: 16, cursor: 'pointer' }}
                    onClick={() => setSearchInput('')}
                  />
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ width: 260, maxWidth: '100%' }}
              />
            </Flex>
          </Flex>

          {/* Tag filter bar */}
          <Flex
            gap={token.sizeXS}
            wrap='wrap'
            align='center'
            style={{
              padding: `${token.sizeXS}px ${token.sizeSM}px`,
              background: token.colorFillQuaternary,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Badge
              count={!selectedTag ? totalCount : 0}
              size='small'
              color={token.colorPrimary}
              overflowCount={999}
            >
              <CheckableTag
                key='all'
                checked={!selectedTag}
                onChange={() => handleSelectTag(undefined)}
              >
                All
              </CheckableTag>
            </Badge>

            {cats.map((cat) => {
              const catVal = getCatValue(cat)
              const checked = isCatChecked(cat)
              return (
                <CheckableTag
                  key={catVal || cat.name}
                  checked={checked}
                  onChange={(isChecked) => handleSelectTag(isChecked ? catVal : undefined)}
                >
                  {cat.name}
                </CheckableTag>
              )
            })}

            {selectedTag && !cats.some((cat) => isCatChecked(cat)) && (
              <CheckableTag
                key={selectedTag}
                checked={true}
                onChange={() => handleSelectTag(undefined)}
              >
                {selectedTag}
              </CheckableTag>
            )}
          </Flex>

          {/* Blog grid / list */}
          <Spin spinning={isLoadingBlogs}>
            {blogsError && (
              <div className='flex items-center justify-center p-4' style={{ minHeight: 400 }}>
                <NotFound
                  classNames={{ container: 'justify-center gap-4' }}
                  label={
                    <h2 className='m-0'>
                      Error loading blog posts: {(blogsError as Error)?.message || 'Unknown error'}
                    </h2>
                  }
                  button={
                    <Button variant='solid' type='primary' onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  }
                />
              </div>
            )}

            {!blogsError && blogs.length > 0 ? (
              <Row gutter={[token.size, token.size]} className='my-4'>
                {blogs.map((blog) => (
                  <Col {...colSpan} key={blog.id || Math.random()}>
                    <Widget styles={{ wrapper: { height: '100%' }, content: { height: '100%' } }}>
                      <BlogItem
                        id={blog.id}
                        title={blog.title}
                        description={blog.description}
                        created_date={blog.created_date}
                        last_update={blog.last_update}
                        relation={blog.relation}
                        tags={blog.tags}
                        compact={false}
                      />
                    </Widget>
                  </Col>
                ))}
              </Row>
            ) : (
              !blogsError && (
                <div className='flex items-center justify-center p-4' style={{ minHeight: 400 }}>
                  <NotFound
                    vertical={true}
                    label={
                      <h2 className='m-0'>
                        {debouncedKeyword
                          ? `Không tìm thấy bài viết nào khớp với "${debouncedKeyword}"${
                              selectedTagName || selectedTag
                                ? ` trong thẻ "${selectedTagName || selectedTag}"`
                                : ''
                            }`
                          : selectedTag
                            ? `No blog posts found with tag "${selectedTagName || selectedTag}"`
                            : 'No blog posts yet'}
                      </h2>
                    }
                    button={
                      debouncedKeyword ? (
                        <Button variant='solid' type='primary' onClick={() => setSearchInput('')}>
                          Xóa tìm kiếm
                        </Button>
                      ) : (
                        <Button
                          variant='solid'
                          type='primary'
                          onClick={() =>
                            openBlogModal('add', {
                              description: '',
                              title: '',
                              relation: [],
                              tags: selectedTag ? [selectedTag] : [],
                            })
                          }
                        >
                          Create your first post
                        </Button>
                      )
                    }
                  />
                </div>
              )
            )}
          </Spin>

          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <Flex justify='center' style={{ marginTop: token.sizeLG }}>
              <Pagination
                current={page + 1}
                pageSize={PAGE_SIZE}
                total={totalCount}
                showSizeChanger={false}
                onChange={(newPage) => setPage(newPage - 1)}
              />
            </Flex>
          )}
        </Space>
      </div>

      {/* Blog Category/Tags Modal */}
      <Modal
        title={
          <Flex align='center' gap={token.size}>
            <TagsOutlined />
            <span>Blog Tags</span>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleAddCategory}
              size='small'
            />
          </Flex>
        }
        open={showCategoryModal}
        onCancel={handleCloseCategoryModal}
        footer={null}
        width={700}
      >
        <BlogTagList categories={cats} />
      </Modal>
    </>
  )
}

export default Blog

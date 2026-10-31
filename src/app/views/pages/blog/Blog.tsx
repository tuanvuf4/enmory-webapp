import {
  AppstoreOutlined,
  PlusOutlined,
  TagsOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Col,
  Divider,
  Flex,
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

import { useBlogs, useBlogsCount, useBlogCategories } from '@/core/hooks'
import { usePrompt } from '@/helpers/hooks'
import { useBlogCategoryModal } from '@/helpers/hooks/useBlogCategoryModal'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import { IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import appStyle from '@/style/appStyle.module.scss'
import { NotFound, PageTitle } from '@/views/components'
import { BlogCategoryList } from '@/views/components/blogCategoryList/blogCategoryList'
import { BlogItem } from '@/views/components/blogItem/BlogItem'
import { Widget } from '@/views/features/widget/Widget'

const { CheckableTag } = Tag

const PAGE_SIZE = 10

export const Blog = () => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState(0)
  const selectedTag = searchParams.get('tag') || undefined
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { openBlogModal } = useBlogModal()
  const { openBlogCategoryModal } = useBlogCategoryModal()

  const {
    data: blogs = [],
    isLoading: isLoadingBlogs,
    error: blogsError,
  } = useBlogs({
    page,
    size: PAGE_SIZE,
    tag: selectedTag,
    categoryId: selectedTag,
    orderBy: 'created_date',
    order: 'DESC',
  })

  const { data: totalCount = 0 } = useBlogsCount(selectedTag)

  const { data: cats = [], isLoading: isLoadingCategories } = useBlogCategories()
  const categories = cats

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

  const handleEditCategory = (category: IBlogCategory) => {
    openBlogCategoryModal('edit', category)
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

  const colSpan =
    viewMode === 'grid'
      ? { xs: 24, sm: 12, md: 12, lg: 8, xl: 8 }
      : { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }

  return (
    <>
      <div className={appStyle.containerMd}>
        <PageTitle content='Blog' />

        {/* Toolbar */}
        <Flex
          justify='space-between'
          align='center'
          gap={token.sizeSM}
          wrap='wrap'
          style={{ marginBottom: token.size }}
        >
          {/* Left actions */}
          <Flex align='center' gap={token.sizeSM}>
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
                New Post
              </Button>
            </Tooltip>

            <Divider type='vertical' style={{ margin: 0 }} />

            <Tooltip title='Blog tags'>
              <Button icon={<TagsOutlined />} onClick={() => setShowCategoryModal(true)}>
                Tags
              </Button>
            </Tooltip>
          </Flex>

          {/* Right: view toggle + post count */}
          <Flex align='center' gap={token.sizeSM}>
            <Space.Compact>
              <Tooltip title='Grid view'>
                <Button
                  icon={<AppstoreOutlined />}
                  type={viewMode === 'grid' ? 'primary' : 'default'}
                  onClick={() => setViewMode('grid')}
                />
              </Tooltip>
              <Tooltip title='List view'>
                <Button
                  icon={<UnorderedListOutlined />}
                  type={viewMode === 'list' ? 'primary' : 'default'}
                  onClick={() => setViewMode('list')}
                />
              </Tooltip>
            </Space.Compact>
          </Flex>
        </Flex>

        {/* Tag filter bar */}
        <Flex
          gap={token.sizeXS}
          wrap='wrap'
          align='center'
          style={{
            marginBottom: token.size,
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

          {categories.map((cat) => (
            <CheckableTag
              key={cat.id || cat.name}
              checked={selectedTag === cat.name}
              onChange={(checked) => handleSelectTag(checked ? cat.name : undefined)}
            >
              {cat.name}
            </CheckableTag>
          ))}

          {!isLoadingCategories &&
            selectedTag &&
            !categories.some((cat) => cat.name === selectedTag) && (
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
                      relation={blog.relation}
                      tags={blog.tags}
                      compact={viewMode === 'list'}
                    />
                  </Widget>
                </Col>
              ))}
            </Row>
          ) : !blogsError ? (
            <div className='flex items-center justify-center p-4' style={{ minHeight: 400 }}>
              <NotFound
                classNames={{ container: 'justify-center gap-4' }}
                label={<h2 className='m-0'>No blog posts found.</h2>}
                button={
                  <Button
                    variant='solid'
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
                    Add
                  </Button>
                }
              />
            </div>
          ) : null}
        </Spin>

        {/* Pagination — only shown when there is more than one page */}
        {totalCount > PAGE_SIZE && (
          <Flex justify='flex-end' style={{ margin: `${token.size}px 0` }}>
            <Pagination
              current={page + 1}
              pageSize={PAGE_SIZE}
              total={totalCount}
              showSizeChanger={false}
              showTotal={(total) => `${total} posts`}
              onChange={(newPage) => setPage(newPage - 1)}
            />
          </Flex>
        )}
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
        keyboard={false}
        width={700}
        maskClosable={false}
      >
        <BlogCategoryList
          categories={cats}
          isLoading={isLoadingCategories}
          onEdit={handleEditCategory}
        />
      </Modal>
    </>
  )
}

export default Blog

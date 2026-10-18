import { useState, useEffect } from 'react'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Col, Row, theme, Button, Spin, Pagination, Flex, Modal, Tag } from 'antd'
import { BlogItem } from '@/views/components/blogItem/BlogItem'
import { useBlogs, useBlogsCount, useBlogCategories } from '@/core/hooks'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import { useBlogCategoryModal } from '@/helpers/hooks/useBlogCategoryModal'
import { PlusOutlined } from '@ant-design/icons'
import { NotFound } from '@/views/components'
import { BlogCategoryList } from '@/views/components/blogCategoryList/blogCategoryList'
import { IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import { Widget } from '@/views/features'
import { usePrompt } from '@/helpers/hooks'

const { CheckableTag } = Tag

const PAGE_SIZE = 10

export const Blog = () => {
  const { message } = usePrompt()
  const { token } = theme.useToken()

  const [page, setPage] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const { openBlogModal } = useBlogModal()
  const { openBlogCategoryModal } = useBlogCategoryModal()

  const {
    data: blogs = [],
    isLoading: isLoadingBlogs,
    error: blogsError,
  } = useBlogs({
    page,
    size: PAGE_SIZE,
    categoryId: selectedCategory,
    orderBy: 'created_date',
    order: 'DESC',
  })

  const { data: totalCount = 0 } = useBlogsCount(selectedCategory)

  const { data: cats = [], isLoading: isLoadingCategories } = useBlogCategories({
    orderBy: 'created_date',
    order: 'ASC',
  })

  const categories = cats

  useEffect(() => {
    if (blogsError) {
      message({
        type: 'error',
        content: (blogsError as Error)?.message || 'Failed to load blog posts',
      })
    }
  }, [blogsError])

  const handleAddCategory = () => {
    openBlogCategoryModal('add', {} as IBlogCategory)
  }

  const handleEditCategory = (category: IBlogCategory) => {
    openBlogCategoryModal('edit', category)
  }

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false)
  }

  const handleSelectCategory = (categoryId?: string) => {
    setPage(0)
    setSelectedCategory(categoryId)
  }

  return (
    <>
      <div className={appStyle.containerMd}>
        <PageTitle content='Blog' />

        <Flex justify='space-between' align={'center'} gap={token.size} wrap={'wrap'}>
          <Flex justify='flex-start' align={'center'} gap={token.size} wrap={'nowrap'}>
            <Button
              variant={'solid'}
              type={'primary'}
              icon={<PlusOutlined />}
              onClick={() =>
                openBlogModal('add', {
                  description: '',
                  title: '',
                  category_id: selectedCategory,
                  relation: [],
                  tags: [],
                })
              }
            />
          </Flex>

          <Flex gap={token.size / 2} wrap={'wrap'} align={'center'}>
            <CheckableTag
              key='all'
              checked={!selectedCategory}
              onChange={() => handleSelectCategory(undefined)}
            >
              All
            </CheckableTag>

            {categories.map((cat) => (
              <CheckableTag
                key={cat.id}
                checked={selectedCategory === cat.id}
                onChange={(checked) => handleSelectCategory(checked ? cat.id : undefined)}
                style={
                  selectedCategory === cat.id && cat.color
                    ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' }
                    : undefined
                }
              >
                {cat.name}
              </CheckableTag>
            ))}
          </Flex>
        </Flex>

        <Spin spinning={isLoadingBlogs}>
          {blogsError && (
            <div className={'flex items-center justify-center p-4'} style={{ minHeight: 400 }}>
              <NotFound
                classNames={{ container: 'justify-center gap-4' }}
                label={
                  <h2 className={'m-0'}>
                    Error loading blog posts: {(blogsError as Error)?.message || 'Unknown error'}
                  </h2>
                }
                button={
                  <Button
                    variant={'solid'}
                    type={'primary'}
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                }
              />
            </div>
          )}

          {!blogsError && blogs.length > 0 ? (
            <Row gutter={[token.size, token.size]} className={'my-4'}>
              {blogs.map((blog) => (
                <Col xs={24} sm={12} md={12} lg={12} xl={12} key={blog.id || Math.random()}>
                  <Widget styles={{ wrapper: { height: '100%' }, content: { height: '100%' } }}>
                    <BlogItem
                      id={blog.id}
                      title={blog.title}
                      description={blog.description}
                      created_date={blog.created_date}
                      category_id={blog.category_id}
                      relation={blog.relation}
                      tags={blog.tags}
                    />
                  </Widget>
                </Col>
              ))}
            </Row>
          ) : !blogsError ? (
            <div className={'flex items-center justify-center p-4'} style={{ minHeight: 400 }}>
              <NotFound
                classNames={{ container: 'justify-center gap-4' }}
                label={<h2 className={'m-0'}>No blog posts found.</h2>}
                button={
                  <Button
                    variant={'solid'}
                    type={'primary'}
                    icon={<PlusOutlined />}
                    onClick={() =>
                      openBlogModal('add', {
                        description: '',
                        title: '',
                        category_id: selectedCategory,
                        relation: [],
                        tags: [],
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

        <Flex justify='flex-end' align={'flex-end'} style={{ margin: token.size }} gap={token.size}>
          <Pagination
            current={page + 1}
            pageSize={PAGE_SIZE}
            total={totalCount}
            onChange={(newPage) => setPage(newPage - 1)}
          />
        </Flex>
      </div>

      {/* Blog Category Modal */}
      <Modal
        title={
          <Flex align={'center'} gap={token.size}>
            <span>Categories</span>
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
        width={900}
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

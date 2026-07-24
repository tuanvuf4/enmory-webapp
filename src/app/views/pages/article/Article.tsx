import { useState, useEffect } from 'react'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Col, Row, theme, Button, Spin, Pagination, Flex, Modal, Radio, message } from 'antd'
import { ArticleItem } from '@/views/components/articleItem/ArticleItem'
import { useArticles, useArticlesCount, useArticleCategories } from '@/core/hooks'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'
import { useArticleCategoryModal } from '@/helpers/hooks/useArticleCategoryModal'
import { PlusOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { NotFound, ArticleCategoryList } from '@/views/components'
import { IArticleCategory } from '@/services/firebase/api/articleCategories.api'
import { useLocation } from 'react-router-dom'
import { Widget } from '@/views/features'

const PAGE_SIZE = 10

export const Article = () => {
  const { token } = theme.useToken()

  const [page, setPage] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const { openArticleModal } = useArticleModal()
  const { openArticleCategoryModal } = useArticleCategoryModal()

  const location = useLocation()

  const isPosts = location.pathname.includes('posts')

  const {
    data: articles = [],
    isLoading: isLoadingArticles,
    error: articlesError,
  } = useArticles({
    page,
    size: PAGE_SIZE,
    categoryId: selectedCategory,
    orderBy: 'created_date',
    order: 'DESC',
  })

  const { data: totalCount = 0 } = useArticlesCount(selectedCategory)

  const { data: cats = [], isLoading: isLoadingCategories } = useArticleCategories({
    orderBy: 'order',
    order: 'ASC',
  })

  const categories = cats.filter((cat) => cat.category_type === (isPosts ? 'posts' : 'articles'))

  useEffect(() => {
    setSelectedCategory(categories[0]?.id)
  }, [location])

  useEffect(() => {
    setSelectedCategory(categories[0]?.id)
  }, [])

  useEffect(() => {
    if (articlesError) {
      message.error((articlesError as Error)?.message || 'Failed to load articles')
    }
  }, [articlesError])

  const handleOpenCategoryModal = () => {
    setShowCategoryModal(true)
  }

  const handleAddCategory = () => {
    openArticleCategoryModal('add', {} as IArticleCategory)
  }

  const handleEditCategory = (category: IArticleCategory) => {
    openArticleCategoryModal('edit', category)
  }

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false)
  }

  const onChangeRadio = (e: any) => {
    setPage(0)
    setSelectedCategory(e.target.value === 'all' ? undefined : e.target.value)
  }

  return (
    <>
      <div className={appStyle.containerMd}>
        <PageTitle content={isPosts ? 'Posts' : 'Articles'} />

        <Flex justify='space-between' align={'center'} gap={token.size} wrap={'wrap'}>
          <Flex justify='flex-start' align={'center'} gap={token.size} wrap={'nowrap'}>
            <Button
              variant={'solid'}
              type={'primary'}
              icon={<PlusOutlined />}
              onClick={() =>
                openArticleModal('add', {
                  description: '',
                  title: '',
                  category_id: selectedCategory,
                })
              }
            >
              Add
            </Button>

            <Button
              variant={'outlined'}
              type={'default'}
              icon={<UnorderedListOutlined />}
              onClick={handleOpenCategoryModal}
            >
              Categories
            </Button>
          </Flex>

          <Radio.Group
            options={[...categories.map((cat) => ({ label: cat.name, value: cat.id }))]}
            onChange={onChangeRadio}
            value={selectedCategory || 'all'}
            optionType='button'
            buttonStyle='solid'
          />
        </Flex>

        <Spin spinning={isLoadingArticles}>
          {articlesError && (
            <div className={'flex items-center justify-center p-4'} style={{ minHeight: 400 }}>
              <NotFound
                classNames={{ container: 'justify-center gap-4' }}
                label={
                  <h2 className={'m-0'}>
                    Error loading articles: {(articlesError as Error)?.message || 'Unknown error'}
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

          {!articlesError && articles.length > 0 ? (
            <Row gutter={[token.size, token.size]} className={'my-4'}>
              {articles.map((article) => (
                <Col xs={24} sm={12} md={12} lg={12} xl={12} key={article.id || Math.random()}>
                  <Widget styles={{ wrapper: { height: '100%' }, content: { height: '100%' } }}>
                    <ArticleItem
                      id={article.id}
                      title={article.title}
                      description={article.description}
                      created_date={article.created_date}
                      category_id={article.category_id}
                    />
                  </Widget>
                </Col>
              ))}
            </Row>
          ) : !articlesError ? (
            <div className={'flex items-center justify-center p-4'} style={{ minHeight: 400 }}>
              <NotFound
                classNames={{ container: 'justify-center gap-4' }}
                label={<h2 className={'m-0'}>No articles found.</h2>}
                button={
                  <Button
                    variant={'solid'}
                    type={'primary'}
                    icon={<PlusOutlined />}
                    onClick={() =>
                      openArticleModal('add', {
                        description: '',
                        title: '',
                        category_id: selectedCategory,
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

      {/* Article Category Modal */}
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
        <ArticleCategoryList
          categories={cats}
          isLoading={isLoadingCategories}
          onEdit={handleEditCategory}
        />
      </Modal>
    </>
  )
}

export default Article

import { useState } from 'react'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Col, Row, theme, Button, Spin, Pagination, Flex, Modal, Select } from 'antd'
import { ArticleItem } from '@/views/components/articleItem/ArticleItem'
import { IArticleItem } from '@/models/article.model'
import { useArticles, useArticlesCount, useArticleCategories } from '@/core/hooks'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'
import { useArticleCategoryModal } from '@/helpers/hooks/useArticleCategoryModal'
import { PlusOutlined } from '@ant-design/icons'
import { NotFound, ArticleCategoryList } from '@/views/components'
import { Toolbar } from '@/views/features'
import { IArticleCategory } from '@/services/firebase/api/articleCategories.api'

interface IArticleProps {
  pageTitle: string
}

const PAGE_SIZE = 10

export const Article = ({ pageTitle = 'Articles' }: IArticleProps) => {
  const { token } = theme.useToken()
  const [page, setPage] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const { openArticleModal } = useArticleModal()
  const { openArticleCategoryModal } = useArticleCategoryModal()

  const { data: articles = [], isLoading: isLoadingArticles } = useArticles({
    page,
    size: PAGE_SIZE,
    categoryId: selectedCategory,
    orderBy: 'created_date',
    order: 'DESC',
  })

  const { data: totalCount = 0 } = useArticlesCount(selectedCategory)

  const { data: categories = [], isLoading: isLoadingCategories } = useArticleCategories({
    orderBy: 'order',
    order: 'ASC',
  })

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

  return (
    <>
      <Toolbar pagination={undefined} />

      <div className={appStyle.containerMd}>
        <PageTitle content={pageTitle} />

        <Flex justify='space-between' align={'center'} gap={token.size}>
          <Flex justify='space-between' align={'center'} gap={token.size}>
            <Button
              variant={'solid'}
              type={'primary'}
              icon={<PlusOutlined />}
              onClick={() => openArticleModal('add', {} as IArticleItem)}
            >
              Post
            </Button>
            <Button variant={'solid'} type={'default'} onClick={handleOpenCategoryModal}>
              Categories
            </Button>
          </Flex>

          <Flex justify='space-between' align={'center'} gap={token.size}>
            <Pagination
              current={page + 1}
              pageSize={PAGE_SIZE}
              total={totalCount}
              onChange={(newPage) => setPage(newPage - 1)}
            />

            <Select
              placeholder='Filter by category'
              style={{ minWidth: 150 }}
              value={selectedCategory || 'all'}
              onChange={(value) => {
                setSelectedCategory(value === 'all' ? undefined : value)
                setPage(0)
              }}
            >
              <Select.Option value='all'>All Categories</Select.Option>
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Flex>
        </Flex>

        <Spin spinning={isLoadingArticles}>
          {articles.length > 0 ? (
            <Row gutter={[token.size, token.size]} className={'my-4'}>
              {articles.map((article) => (
                <Col xs={24} sm={12} md={12} lg={12} xl={12} key={article.id || Math.random()}>
                  <ArticleItem
                    id={article.id}
                    title={article.title}
                    description={article.description}
                    created_date={article.created_date}
                    category_id={article.category_id}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <div style={{ textAlign: 'center', padding: token.size * 2 }}>
              <NotFound
                classNames={{ container: 'justify-center gap-4' }}
                label={<h2 className={'m-0'}>No articles found.</h2>}
                button={
                  <Button
                    variant={'solid'}
                    type={'primary'}
                    icon={<PlusOutlined />}
                    onClick={() => openArticleModal('add')}
                  >
                    Add Post
                  </Button>
                }
              />
            </div>
          )}
        </Spin>
      </div>

      {/* Article Category Modal */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: token.size,
            }}
          >
            <span>Categories</span>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleAddCategory}
              size='small'
            />
          </div>
        }
        open={showCategoryModal}
        onCancel={handleCloseCategoryModal}
        footer={null}
        keyboard={false}
        width={900}
        maskClosable={false}
      >
        <ArticleCategoryList
          categories={categories}
          isLoading={isLoadingCategories}
          onEdit={handleEditCategory}
        />
      </Modal>
    </>
  )
}

export default Article

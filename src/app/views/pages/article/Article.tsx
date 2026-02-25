import { useState } from 'react'
import globalStyles from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Col, Row, theme, Button, Spin, Pagination, Flex } from 'antd'
import { ArticleItem } from '@/views/components/articleItem/ArticleItem'
import { IArticleItem } from '@/models/article.model'
import { useArticles, useArticlesCount } from '@/core/hooks'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'
import { PlusOutlined } from '@ant-design/icons'
import { NotFound } from '@/views/components'

interface IArticleProps {
  pageTitle: string
}

const PAGE_SIZE = 10

export const Article = ({ pageTitle = 'Articles' }: IArticleProps) => {
  const { token } = theme.useToken()
  const [page, setPage] = useState(0)

  const { openArticleModal } = useArticleModal()

  const { data: articles = [], isLoading: isLoadingArticles } = useArticles({
    page,
    size: PAGE_SIZE,
    orderBy: 'created_date',
    order: 'DESC',
  })

  const { data: totalCount = 0 } = useArticlesCount()

  return (
    <div className={globalStyles.containerMd}>
      <PageTitle content={pageTitle} />

      {articles.length > 0 && (
        <Flex justify='space-between' gap={token.size / 2}>
          <Button
            variant={'solid'}
            type={'primary'}
            icon={<PlusOutlined />}
            onClick={() => openArticleModal('add', {} as IArticleItem)}
          >
            Add Post
          </Button>

          <Pagination
            current={page + 1}
            pageSize={PAGE_SIZE}
            total={totalCount}
            onChange={(newPage) => setPage(newPage - 1)}
          />
        </Flex>
      )}

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
  )
}

export default Article

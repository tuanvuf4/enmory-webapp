import React from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import globalStyles from '@/style/appStyle.module.scss'
import style from './style.module.scss'
import { useArticle } from '@/core/hooks'
import { Button, Spin, theme } from 'antd'
import { setting } from '@/config/appConfig'
import moment from 'moment'
import { NotFound } from '@/views/components'
import { EditOutlined } from '@ant-design/icons'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'

const ArticleDetail: React.FC = () => {
  const { token } = theme.useToken()
  const { id } = useParams<{ id: string }>()

  const { openArticleModal } = useArticleModal()

  const { data: article, isLoading } = useArticle(id || '', !!id)

  return (
    <div className={globalStyles.containerMd}>
      <PageTitle content={article?.title || 'Article detail'} />

      <div className={globalStyles.contentPage}>
        {article && (
          <div className={'text-right'}>
            <i className={'mr-4'}>
              Posted on:
              {article?.created_date
                ? moment(article.created_date).format(setting.dateTimeFormat)
                : ''}
            </i>

            <Button
              variant={'text'}
              type={'default'}
              icon={<EditOutlined />}
              onClick={() => {
                openArticleModal('edit', { ...article })
              }}
            >
              Edit
            </Button>
          </div>
        )}

        <Spin spinning={isLoading}>
          <div style={{ padding: token.size }}>
            {article ? (
              <div className={style.content}>
                <div
                  className={'mb-4'}
                  dangerouslySetInnerHTML={{ __html: article.description || '' }}
                />

                <Button
                  variant={'text'}
                  type={'default'}
                  icon={<EditOutlined />}
                  onClick={() => {
                    openArticleModal('edit', { ...article })
                  }}
                >
                  Edit
                </Button>
              </div>
            ) : (
              <NotFound
                classNames={{ container: 'justify-center' }}
                label={<h2>Article not found.</h2>}
                showButton={false}
              />
            )}
          </div>
        </Spin>
      </div>
    </div>
  )
}

export default ArticleDetail

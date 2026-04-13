import React from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import appStyle from '@/style/appStyle.module.scss'
import style from './style.module.scss'
import { useArticle } from '@/core/hooks'
import { Button, Flex, Spin, theme } from 'antd'
import { setting } from '@/config/appConfig'
import moment from 'moment'
import { NotFound } from '@/views/components'
import { EditOutlined } from '@ant-design/icons'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'
import clsx from 'clsx'
import { Toolbar } from '@/views/features'

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { token } = theme.useToken()

  const { openArticleModal } = useArticleModal()

  const { data: article, isLoading } = useArticle(id || '', !!id)

  return (
    <>
      <Toolbar pagination={undefined} />

      <div className={appStyle.containerMd}>
        <PageTitle content={article?.title || 'Article detail'} />

        <div className={clsx(appStyle.contentPage, '!px-8')}>
          {article && (
            <Flex justify={'space-between'} align={'center'} gap={token.size} className={'!mb-4'}>
              <i className={'text-xs'}>
                {`Posted on: `}
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
            </Flex>
          )}

          <Spin spinning={isLoading}>
            {article ? (
              <div
                className={clsx(style.content, 'mb-4')}
                dangerouslySetInnerHTML={{ __html: article.description || '' }}
              />
            ) : (
              <NotFound
                classNames={{ container: 'justify-center' }}
                label={<h2>Article not found.</h2>}
                showButton={false}
              />
            )}
          </Spin>
        </div>
      </div>
    </>
  )
}

export default ArticleDetail

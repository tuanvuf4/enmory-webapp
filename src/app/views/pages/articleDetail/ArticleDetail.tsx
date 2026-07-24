import React from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import appStyle from '@/style/appStyle.module.scss'
import { useArticle } from '@/core/hooks'
import { Button, Flex, Spin, theme } from 'antd'
import { appSetting } from '@/config/appConfig'
import moment from 'moment'
import { EditOutlined } from '@ant-design/icons'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'
import clsx from 'clsx'
import { Widget } from '@/views/features/widget/Widget'

const ArticleDetail: React.FC = () => {
  const params = useParams<{ id: string }>()

  const { token } = theme.useToken()

  const { openArticleModal } = useArticleModal()

  const { id } = params

  const { data: article, isLoading } = useArticle(id || '', !!id)

  return (
    <div className={clsx(appStyle.contentPage, appStyle.containerMd)}>
      <Spin spinning={isLoading} style={{ width: '100%' }}>
        {article && (
          <>
            <PageTitle content={article?.title || 'Article detail'} />

            <Flex justify={'space-between'} align={'center'} gap={token.size} className={'!mb-4'}>
              <i className={'text-xs'}>
                {`Posted on: `}
                {article?.created_date
                  ? moment(article.created_date).format(appSetting.dateTimeFormat)
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

            <Widget>
              <div
                className={clsx(appStyle.article)}
                dangerouslySetInnerHTML={{ __html: article.description || '' }}
              />
            </Widget>
          </>
        )}
      </Spin>
    </div>
  )
}

export default ArticleDetail

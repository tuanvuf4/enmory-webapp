import React from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import globalStyles from '@/style/appStyle.module.scss'
import { useArticle } from '@/core/hooks'
import { Spin, theme } from 'antd'
import { setting } from '@/config/appConfig'
import moment from 'moment'
import { NotFound } from '@/views/components'

const ArticleDetail: React.FC = () => {
  const { token } = theme.useToken()
  const { id } = useParams<{ id: string }>()

  const { data: article, isLoading } = useArticle(id || '', !!id)

  return (
    <div className={globalStyles.containerMd}>
      <PageTitle content={article?.title || 'Article detail'} />

      <div className={'text-center'}>
        <i>
          Posted on:{' '}
          {article?.created_date ? moment(article.created_date).format(setting.dateTimeFormat) : ''}
        </i>
      </div>

      <Spin spinning={isLoading}>
        <div style={{ padding: token.size }}>
          {article ? (
            <div dangerouslySetInnerHTML={{ __html: article.description || '' }} />
          ) : (
            <NotFound label={'Article not found.'} />
          )}
        </div>
      </Spin>
    </div>
  )
}

export default ArticleDetail

import React from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import appStyle from '@/style/appStyle.module.scss'
import { useBlog } from '@/core/hooks'
import { Button, Flex, Spin, theme } from 'antd'
import { appSetting } from '@/config/appConfig'
import moment from 'moment'
import { EditOutlined } from '@ant-design/icons'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'
import clsx from 'clsx'
import { Widget } from '@/views/features/widget/Widget'

export const BlogDetail: React.FC = () => {
  const params = useParams<{ id: string }>()

  const { token } = theme.useToken()

  const { openBlogModal } = useBlogModal()

  const { id } = params

  const { data: blog, isLoading } = useBlog(id || '', !!id)

  return (
    <div className={clsx(appStyle.contentPage, appStyle.containerMd)}>
      <Spin spinning={isLoading} style={{ width: '100%' }}>
        {blog && (
          <>
            <PageTitle content={blog?.title || 'Blog detail'} />

            <Flex justify={'space-between'} align={'center'} gap={token.size} className={'!mb-4'}>
              <i className={'text-xs'}>
                {`Posted on: `}
                {blog?.created_date
                  ? moment(blog.created_date).format(appSetting.dateTimeFormat)
                  : ''}
              </i>

              <Button
                variant={'text'}
                type={'default'}
                icon={<EditOutlined />}
                onClick={() => {
                  openBlogModal('edit', { ...blog })
                }}
              >
                Edit
              </Button>
            </Flex>

            <Widget>
              <div
                className={clsx(appStyle.blog, appStyle.article)}
                dangerouslySetInnerHTML={{ __html: blog.description || '' }}
              />
            </Widget>
          </>
        )}
      </Spin>
    </div>
  )
}

export default BlogDetail

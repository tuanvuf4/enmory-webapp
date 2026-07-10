import { IArticleItem } from '@/models/article.model'
import styles from './articleItem.module.scss'
import { appSetting } from '@/config/index'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Button, Flex } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useArticleModal } from '@/helpers/hooks/useArticleModal'

export const ArticleItem = ({
  id,
  title,
  description,
  created_date,
  category_id,
}: IArticleItem) => {
  const navigate = useNavigate()
  const { openArticleModal } = useArticleModal()

  return (
    <div className={clsx(styles.articleItem, 'article')}>
      <Flex justify={'space-between'} gap={8}>
        <h2 className={'font-bold cursor-pointer'} onClick={() => navigate(`/article/${id}`)}>
          {title}
        </h2>

        <Button
          variant={'text'}
          type={'text'}
          icon={<EditOutlined />}
          onClick={() => {
            openArticleModal('edit', { id, title, description, created_date, category_id })
          }}
        />
      </Flex>
      <div>
        <span className={'italic'}>
          Posted on: {moment(created_date).format(appSetting.dateTimeFormat)}
        </span>
      </div>

      <div
        className={'text-base mt-4 mb-4'}
        dangerouslySetInnerHTML={{
          __html: description.length > 200 ? `${description.substring(0, 200)}...` : description,
        }}
      />

      <div className={'cursor-pointer'}>
        <Button variant={'outlined'} type={'default'} onClick={() => navigate(`/article/${id}`)}>
          Read more
        </Button>
      </div>
    </div>
  )
}

import { IBlogItem } from '@/models/blog.model'
import { appSetting } from '@/config/index'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { Button, Flex } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useBlogModal } from '@/helpers/hooks/useBlogModal'

export const BlogItem = ({
  id,
  title,
  description,
  created_date,
  category_id,
  relation,
  tags,
}: IBlogItem) => {
  const navigate = useNavigate()
  const { openBlogModal } = useBlogModal()

  return (
    <>
      <Flex justify={'space-between'} gap={8}>
        <h2 className={'font-bold cursor-pointer'} onClick={() => navigate(`/blog/${id}`)}>
          {title}
        </h2>
        <Button
          variant={'text'}
          icon={<EditOutlined />}
          onClick={() => {
            openBlogModal('edit', { id, title, description, created_date, category_id, relation, tags })
          }}
        />
      </Flex>

      <div>
        <span className={'italic'}>
          Posted on: {moment(created_date).format(appSetting.dateTimeFormat)}
        </span>
      </div>

      <div
        className={'mt-4 mb-4'}
        dangerouslySetInnerHTML={{
          __html: description.length > 200 ? `${description.substring(0, 200)}...` : description,
        }}
      />

      <div className={'cursor-pointer'}>
        <Button variant={'outlined'} type={'default'} onClick={() => navigate(`/blog/${id}`)}>
          Read more
        </Button>
      </div>
    </>
  )
}

export const ArticleItem = BlogItem

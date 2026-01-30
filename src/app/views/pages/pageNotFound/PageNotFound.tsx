import clsx from 'clsx'
import globalStyle from '@/style/appStyle'
import { Button, Row } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

interface IPageNotFoundProps {
  text?: string
}

export const PageNotFound = ({ text = 'Page not found' }: IPageNotFoundProps) => {
  const globalClasses = globalStyle()

  const navigate = useNavigate()

  return (
    <div className={globalClasses.container}>
      <h2 className={clsx([globalClasses.pageTitle])}>{text}</h2>

      <div className={clsx(globalClasses.contentPage)}>
        <Row justify={'center'} align={'middle'} className='gap-4'>
          <Button
            type={'primary'}
            variant={'outlined'}
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
          >
            Go Home
          </Button>
        </Row>
      </div>
    </div>
  )
}

export default PageNotFound

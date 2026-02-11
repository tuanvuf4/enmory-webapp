import clsx from 'clsx'
import globalStyles from "@/style/appStyle.module.scss"
import { Button, Row } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

interface IPageNotFoundProps {
  text?: string
}

export const PageNotFound = ({ text = 'Page not found' }: IPageNotFoundProps) => {
  

  const navigate = useNavigate()

  return (
    <div className={globalStyles.container}>
      <h2 className={clsx([globalStyles.pageTitle])}>{text}</h2>

      <div className={clsx(globalStyles.contentPage)}>
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

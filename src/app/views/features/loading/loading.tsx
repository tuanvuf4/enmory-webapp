// import loading from 'src/assets/img/loading.gif'
import { useAxiosLoader } from 'src/app/core/hooks/axiosHttpCounter'
import { theme } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { Spin } from 'antd'
import styles from './style'
import classNames from 'clsx'

export const Loading = () => {
  const { token } = theme.useToken()
  const classes = styles(token)

  const [active] = useAxiosLoader()

  return (
    <>
      <div className={classNames(classes.loading, active ? classes.active : '')}>
        {/* <img src={loading} alt='' /> */}
        <Spin
          spinning={active}
          size={'large'}
          // indicator={<LoadingOutlined style={{ fontSize: 44, color: token.colorPrimary }} spin />}
        />
      </div>
    </>
  )
}

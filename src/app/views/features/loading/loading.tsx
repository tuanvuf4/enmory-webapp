// import loading from 'src/assets/img/loading.gif'
import { useAxiosLoader } from '@/core/hooks/axiosHttpCounter'
import { Spin } from 'antd'
import styles from './style'
import classNames from 'clsx'
import { useState } from 'react'

export const Loading = () => {
  const classes = styles()

  // const [active] = useAxiosLoader()

  const [active] = useState(true)

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

// import loading from 'src/assets/img/loading.gif'
import { Spin } from 'antd'
import styles from './style'
import classNames from 'clsx'
import { useState } from 'react'

export const Loading = () => {
  const classes = styles()

  const [active] = useState(true)

  return (
    <div className={classNames(classes.loading, active ? classes.active : '')}>
      <Spin spinning={active} size={'large'} />
    </div>
  )
}

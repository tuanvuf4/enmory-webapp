// import loading from 'src/assets/img/loading.gif'
import { Spin } from 'antd'
import styles from './style'
import classNames from 'clsx'
import { useSelector } from '@/core/hooks'
interface ILoadingProps {
  active?: boolean
}

export const Loading = ({ active = false }: ILoadingProps) => {
  const classes = styles()

  const { loading } = useSelector((state) => state.setting)

  const show = active || loading

  if (!active && !loading) return null

  return (
    <div className={classNames(classes.loading, show ? classes.active : '')}>
      <Spin spinning={show} size={'large'} />
    </div>
  )
}

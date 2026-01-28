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

  if (!active || !loading) return null

  return (
    <div className={classNames(classes.loading, active || loading ? classes.active : '')}>
      <Spin spinning={active} size={'large'} />
    </div>
  )
}

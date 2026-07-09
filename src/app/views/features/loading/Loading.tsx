// import loading from 'src/assets/img/loading.gif'
import { Spin } from 'antd'
import styles from './loading.module.scss'
import classNames from 'clsx'
import { useSelector } from '@/core/hooks'
interface ILoadingProps {
  show?: boolean
  inner?: boolean
}

export const Loading = ({ show: active = false, inner = false }: ILoadingProps) => {
  const { loading } = useSelector((state) => state.setting)

  const show = active || loading

  if (!active && !loading) return null

  return (
    <div
      className={classNames(styles.loading, inner ? styles.inner : '', show ? styles.active : '')}
    >
      <Spin spinning={show} size={'large'} />
    </div>
  )
}

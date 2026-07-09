import { useAxiosLoader } from '@/core/hooks/axiosHttpCounter'
import styles from './loading.module.scss'

export const LoadingBar = () => {
  const [active] = useAxiosLoader()

  return <div className={styles.loader}>{active && <div className={styles.bar}></div>}</div>
}

import { useAxiosLoader } from '@/core/hooks/axiosHttpCounter'
import styles from './style'

export const LoadingBar = () => {
  const classes = styles()

  const [active] = useAxiosLoader()

  return <div className={classes.loader}>{active && <div className={classes.bar}></div>}</div>
}

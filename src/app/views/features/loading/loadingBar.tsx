import { useAxiosLoader } from 'src/app/core/hooks/axiosHttpCounter'
import { theme } from 'antd'
import styles from './style'

export const LoadingBar = () => {
  const { token } = theme.useToken()
  const classes = styles(token)

  const [active] = useAxiosLoader()

  return <div className={classes.loader}>{active && <div className={classes.bar}></div>}</div>
}

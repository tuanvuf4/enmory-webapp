import { theme } from 'antd'
import classNames from 'clsx'
import gStyles from 'src/style/appStyle'
import styles from './style'

export const NotFound = () => {
  const { token } = theme.useToken()
  const classes = styles(token)
  const gClasses = gStyles(token)

  return (
    <div className={gClasses.container}>
      <h2 className={classNames([classes.notFound, gClasses.bodyContent])}>Page not found!</h2>
    </div>
  )
}

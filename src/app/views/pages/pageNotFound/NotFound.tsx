import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import styles from './style'

export const PageNotFound = () => {
  const classes = styles()
  const gClasses = globalStyle()

  return (
    <div className={gClasses.container}>
      <h2 className={classNames([classes.notFound, gClasses.bodyContent])}>Page not found!</h2>
    </div>
  )
}

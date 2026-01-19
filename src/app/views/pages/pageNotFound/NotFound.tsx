import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import styles from './style'

export const PageNotFound = () => {
  const classes = styles()
  const globalClasses = globalStyle()

  return (
    <div className={globalClasses.container}>
      <h2 className={classNames([classes.notFound, globalClasses.bodyContent])}>Page not found!</h2>
    </div>
  )
}

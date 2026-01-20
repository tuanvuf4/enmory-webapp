import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import styles from './style'

interface INotFoundProps {
  text?: string
}

export const NotFound = ({ text = 'Page not found' }: INotFoundProps) => {
  const classes = styles()
  const globalClasses = globalStyle()

  return (
    <div className={globalClasses.container}>
      <h2 className={classNames([classes.notFound, globalClasses.bodyContent])}>{text}</h2>
    </div>
  )
}

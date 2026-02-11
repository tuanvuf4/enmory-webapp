import globalStyles from '@/style/appStyle.module.scss'
import clsx from 'clsx'

export const PageTitle = ({ content }: { content: JSX.Element | string }) => {
  

  return <h2 className={clsx(globalStyles.pageTitle)}>{content}</h2>
}

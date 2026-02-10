import globalStyle from '@/style/appStyle'
import clsx from 'clsx'

export const PageTitle = ({ content }: { content: React.JSX.Element | string }) => {
  const globalClasses = globalStyle()

  return <h2 className={clsx(globalClasses.pageTitle)}>{content}</h2>
}

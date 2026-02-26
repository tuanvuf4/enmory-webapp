import appStyle from '@/style/appStyle.module.scss'
import clsx from 'clsx'
import { JSX } from 'react'

export const PageTitle = ({ content }: { content: JSX.Element | string }) => {
  return <h2 className={clsx(appStyle.pageTitle)}>{content}</h2>
}

import React, { PropsWithChildren } from 'react'
import styles from './widget.module.scss'
import appStyle from '@/style/appStyle.module.scss'
import clsx from 'clsx'

interface IProps {
  title?: string
}

export const Widget: React.FC<PropsWithChildren & IProps> = ({ children, title }) => {
  return (
    <div className={styles.widget}>
      {title && <h3 className={clsx(styles.widgetTitle, appStyle.pageTitle)}>{title}</h3>}

      <div className={styles.widgetContent}>{children}</div>
    </div>
  )
}

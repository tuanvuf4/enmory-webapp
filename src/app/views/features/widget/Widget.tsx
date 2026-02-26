import React, { PropsWithChildren } from 'react'
import styles from './style.module.scss'

interface IProps {
  title?: string
}

export const Widget: React.FC<PropsWithChildren & IProps> = ({ children, title }) => {
  return (
    <div className={styles.widget}>
      {title && <h3 className={styles.widgetTitle}>{title}</h3>}

      <div className={styles.widgetContent}>{children}</div>
    </div>
  )
}

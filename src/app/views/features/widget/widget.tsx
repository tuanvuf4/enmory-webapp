import React, { PropsWithChildren } from 'react'
import styles from './style'

interface IProps {
  title?: string
}

export const Widget: React.FC<PropsWithChildren & IProps> = ({ children, title }) => {
  const classes = styles()

  return (
    <div className={classes.widget}>
      <h3 className={classes.widgetTitle}>{title}</h3>

      <div className={classes.widgetContent}>{children}</div>
    </div>
  )
}

import React, { PropsWithChildren } from 'react'
import { theme } from 'antd'
import styles from './style'

interface IProps {
  title?: string
}

export const Widget: React.FC<PropsWithChildren & IProps> = ({ children, title }) => {
  const { token } = theme.useToken()
  const classes = styles(token)

  return (
    <div className={classes.widget}>
      <h3 className={classes.widgetTitle}>{title}</h3>

      <div className={classes.widgetContent}>{children}</div>
    </div>
  )
}

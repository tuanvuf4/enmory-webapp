import React from 'react'
import { useAppDispatch, useAppSelector } from 'src/app/core/hooks/redux'
import { theme } from 'antd'
import styles from './style'

export const Template: React.FC = () => {
  const { token } = theme.useToken()
  const classes = styles(token)

  const config = useAppSelector((state) => state.config)

  const dispatch = useAppDispatch()

  return (
    <div className={classes.className}>
      <h2>Template</h2>
    </div>
  )
}

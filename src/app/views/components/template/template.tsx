import React from 'react'
import styles from './style'

export const Template: React.FC = () => {
  const classes = styles()

  return (
    <div className={classes.className}>
      <h2>Template</h2>
    </div>
  )
}

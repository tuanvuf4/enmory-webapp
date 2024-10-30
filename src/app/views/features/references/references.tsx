import { appConfig } from '@/app/config/appConfig'
import { Button } from 'antd'
import styles from './style'
import React from 'react'
import gStyles from '@/style/appStyle'
import { useAppSelector } from '@core/hooks'

interface IPros {
  original: string
}

export const Reference: React.FC<IPros> = ({ original }) => {
  const classes = styles()
  const gClasses = gStyles()

  const { user } = useAppSelector((state) => state.auth)

  return (
    <div className={classes.references}>
      {appConfig.references.map((reference, key) => {
        if (user.configuration.references.findIndex((item) => item === reference.id) > -1)
          return (
            <Button
              key={key}
              className={gClasses.referenceBtn}
              type='text'
              size='small'
              onClick={() => {
                window.open(reference.url + original, reference.target)
              }}
            >
              {reference.src}
            </Button>
          )
      })}
    </div>
  )
}

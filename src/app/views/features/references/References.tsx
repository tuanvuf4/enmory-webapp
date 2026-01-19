import { appConfig } from '@/app/config/appConfig'
import { Button } from 'antd'
import styles from './style'
import React from 'react'
import globalStyle from '@/style/appStyle'
import { useSelector } from '@/core/hooks'

interface IPros {
  origin: string
}

export const Reference: React.FC<IPros> = ({ origin }) => {
  const classes = styles()
  const globalClasses = globalStyle()

  const { user } = useSelector((state) => state.auth)

  return (
    <div className={classes.references}>
      {appConfig.references.map((reference, key) => {
        if (user.configuration.references.findIndex((item) => item === reference.id) > -1)
          return (
            <Button
              key={key}
              className={globalClasses.referenceBtn}
              type='text'
              size='small'
              onClick={() => {
                window.open(reference.url + origin, reference.target)
              }}
            >
              {reference.src}
            </Button>
          )
      })}
    </div>
  )
}

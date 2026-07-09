import { appConfig } from '@/config/appConfig'
import { Button } from 'antd'
import styles from './references.module.scss'
import React from 'react'
import appStyle from '@/style/appStyle.module.scss'
import { useSelector } from '@/core/hooks'

interface IPros {
  origin: string
}

export const Reference: React.FC<IPros> = ({ origin }) => {
  const { user } = useSelector((state) => state.auth)

  return (
    <div className={styles.references}>
      {appConfig.references.map((reference, key) => {
        if (
          user?.configuration &&
          user.configuration.references.findIndex((item) => item === reference.id) > -1
        )
          return (
            <Button
              key={key}
              className={appStyle.referenceBtn}
              type='text'
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

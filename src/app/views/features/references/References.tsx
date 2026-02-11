import { appConfig } from '@/app/config/appConfig'
import { Button } from 'antd'
import styles from './style.module.scss'
import React from 'react'
import globalStyles from '@/style/appStyle.module.scss'
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
              className={globalStyles.referenceBtn}
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

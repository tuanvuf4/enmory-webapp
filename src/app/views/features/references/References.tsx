import { appConfig } from '@/config/appConfig'
import { Button, theme } from 'antd'
import React from 'react'
import appStyle from '@/style/appStyle.module.scss'
import { useSelector } from '@/core/hooks'

interface IPros {
  style: React.CSSProperties
  origin: string
}

export const Reference: React.FC<IPros> = ({ origin, style }) => {
  const { token } = theme.useToken()
  const { user } = useSelector((state) => state.auth)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        gap: `${token.size * 0.5}px`,
        ...style,
      }}
    >
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

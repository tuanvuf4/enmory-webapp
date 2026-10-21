import { appConfig } from '@/config/appConfig'
import { Button, Flex, theme } from 'antd'
import React from 'react'
import appStyle from '@/style/appStyle.module.scss'
import { useSelector } from '@/core/hooks'

export interface IReferenceItem {
  id: number
  src: string
  url: string
  target: string
}

interface IPros {
  style?: React.CSSProperties
  origin: string
  onSelect?: (reference: IReferenceItem) => void
  loadingId?: number | null
  autoFill?: boolean
}

export const Reference: React.FC<IPros> = ({ origin, style, onSelect, loadingId }) => {
  const { token } = theme.useToken()
  const { user } = useSelector((state) => state.auth)

  if (appConfig.references.length === 0) return null

  return (
    <Flex
      align={'center'}
      justify={'flex-start'}
      wrap={'wrap'}
      gap={token.size * 0.25}
      style={{ ...style }}
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
              loading={loadingId === reference.id}
              disabled={!!loadingId && loadingId !== reference.id}
              title={
                onSelect
                  ? `Click to auto-fill with ${reference.src} (Ctrl+Click to open link)`
                  : `Open ${reference.src}`
              }
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || !onSelect) {
                  window.open(reference.url + origin, reference.target)
                  return
                }
                onSelect(reference)
              }}
            >
              {reference.src}
            </Button>
          )
      })}
    </Flex>
  )
}

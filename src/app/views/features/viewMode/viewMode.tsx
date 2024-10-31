import React from 'react'
import { useAppDispatch, useAppSelector } from 'src/app/core/hooks/redux'
import { Button, theme, Tooltip } from 'antd'
import styles from './style'
import { AppstoreOutlined, MenuOutlined } from '@ant-design/icons'
import { EViewMode } from 'src/app/models/app.model'
import { appStyleConfig } from 'src/style/appStyle'
import { configAction } from 'src/app/store/reducers/config.reducer'

export const ViewMode: React.FC = () => {
  const { token } = theme.useToken()

  const classes = styles()

  const { viewMode } = useAppSelector((state) => state.config)

  const dispatch = useAppDispatch()

  return (
    <div className={classes.viewOptions}>
      <Tooltip title='List'>
        <Button
          type={viewMode === EViewMode.LIST ? 'primary' : 'text'}
          shape='default'
          icon={
            <MenuOutlined
              style={{
                color:
                  viewMode === EViewMode.LIST
                    ? appStyleConfig.color.white[0]
                    : appStyleConfig.color.neutral[1],
              }}
            />
          }
          onClick={() => dispatch(configAction.setViewMode(EViewMode.LIST))}
        />
      </Tooltip>

      <Tooltip title='Grid' style={{ padding: token.size / 2 }}>
        <Button
          type={viewMode === EViewMode.GRID ? 'primary' : 'text'}
          shape='default'
          icon={
            <AppstoreOutlined
              style={{
                color:
                  viewMode === EViewMode.GRID
                    ? appStyleConfig.color.white[0]
                    : appStyleConfig.color.neutral[13],
              }}
            />
          }
          onClick={() => dispatch(configAction.setViewMode(EViewMode.GRID))}
        />
      </Tooltip>
    </div>
  )
}

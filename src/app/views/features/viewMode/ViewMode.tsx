import React from 'react'
import { Button, theme, Tooltip } from 'antd'
import styles from './style'
import { AppstoreOutlined, MenuOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { styleConfig } from '@/style/appStyle'
import { useDispatch, useSelector } from '@/core/hooks'
import { EViewMode } from '@/models/app.model'

export const ViewMode: React.FC = () => {
  const { token } = theme.useToken()

  const classes = styles()

  const { viewMode } = useSelector((state) => state.setting)

  const dispatch = useDispatch()

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
                    ? styleConfig.color.white[0]
                    : styleConfig.color.neutral[1],
              }}
            />
          }
          onClick={() => dispatch(settingAction.setViewMode(EViewMode.LIST))}
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
                    ? styleConfig.color.white[0]
                    : styleConfig.color.neutral[13],
              }}
            />
          }
          onClick={() => dispatch(settingAction.setViewMode(EViewMode.GRID))}
        />
      </Tooltip>
    </div>
  )
}

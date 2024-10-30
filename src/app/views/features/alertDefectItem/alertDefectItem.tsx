import React from 'react'
import { Button, Popover, theme } from 'antd'
import styles from './style'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { msgWarning } from '@/constant/validation'
import { IItem } from '@/models/item.model'

interface IProps {
  item: IItem
  title?: string
}

export const AlertDefectItem: React.FC<IProps> = ({ item, title = msgWarning.missingMeaning }) => {
  const { token } = theme.useToken()
  const classes = styles(token)

  return (
    <Popover title={title}>
      <Button
        type='text'
        size='small'
        danger
        className={classes.warnIcon}
        icon={<ExclamationCircleOutlined />}
      />
    </Popover>
  )
}

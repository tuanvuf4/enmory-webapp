import { theme } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ReadOutlined,
  StarFilled,
  SyncOutlined,
} from '@ant-design/icons'
import { ItemType } from 'antd/es/menu/interface'
import { IItem } from '@/models/item.model'

interface IActionItem {
  label: string
  icon: React.ReactNode
}

export const ActionItem: React.FC<IActionItem> = (props) => {
  const { label = '', icon } = props
  const { token } = theme.useToken()
  const itemStyle = {
    fontSize: token.fontSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flexStart',
  }
  const iconStyle = { marginRight: 8, fontSize: 16 }

  return (
    <div style={itemStyle}>
      <span style={iconStyle}>{icon}</span>
      {label}
    </div>
  )
}

export const getActionMenuItems = (data: IItem): ItemType[] => {
  return [
    {
      key: 0,
      label: <ActionItem label='View' icon={<EyeOutlined />} />,
    },
    {
      key: 1,
      label: <ActionItem label='Edit' icon={<EditOutlined />} />,
    },
    {
      key: 2,
      label: (
        <ActionItem
          label={`${data.level === 0 ? '5' : '0'}`}
          icon={<StarFilled color={'yellow'} />}
        />
      ),
    },
    {
      key: 5,
      label: <ActionItem label='Archive' icon={<ReadOutlined />} />,
    },
    {
      key: 3,
      label: <ActionItem label='Reset' icon={<SyncOutlined />} />,
    },
    {
      key: 4,
      label: <ActionItem label='Delete' icon={<DeleteOutlined />} />,
    },
  ]
}

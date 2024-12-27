import { theme } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  StarFilled,
  SyncOutlined,
} from '@ant-design/icons'
import { ItemType } from 'antd/es/menu/interface'

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

export const actionMenuItems: ItemType[] = [
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
    label: <ActionItem label='Redo' icon={<StarFilled color={'yellow'} />} />,
  },
  {
    key: 5,
    label: <ActionItem label='5 Stars' icon={<StarFilled />} />,
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

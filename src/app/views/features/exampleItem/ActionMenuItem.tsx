import { theme } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import { ItemType } from 'antd/es/menu/interface'

interface IActionItem {
  label: string
  icon: React.ReactNode
}

export const ActionItemExtension: React.FC<IActionItem> = (props) => {
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
    label: <ActionItemExtension label='View' icon={<EyeOutlined />} />,
  },
  {
    key: 1,
    label: <ActionItemExtension label='Edit' icon={<EditOutlined />} />,
  },
  {
    key: 2,
    label: <ActionItemExtension label='Delete' icon={<DeleteOutlined />} />,
  },
]

export const actionMenuEx: ItemType[] = [
  {
    key: 1,
    label: <ActionItemExtension label='Edit' icon={<EditOutlined />} />,
  },
  {
    key: 2,
    label: <ActionItemExtension label='Delete' icon={<DeleteOutlined />} />,
  },
]

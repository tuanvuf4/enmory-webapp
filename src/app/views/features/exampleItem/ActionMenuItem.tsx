import { theme } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  PushpinOutlined,
  PushpinFilled,
} from '@ant-design/icons'
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

export const getActionMenuExample = (isPinned = false): ItemType[] => [
  {
    key: 6,
    label: (
      <ActionItemExtension
        label={isPinned ? 'Unpin' : 'Pin'}
        icon={isPinned ? <PushpinFilled /> : <PushpinOutlined />}
      />
    ),
  },
  {
    key: 1,
    label: <ActionItemExtension label='Edit' icon={<EditOutlined />} />,
  },
  {
    key: 3,
    label: <ActionItemExtension label='Copy' icon={<CopyOutlined />} />,
  },
  // {
  //   key: 4,
  //   label: <ActionItemExtension label='View Word' icon={<BookOutlined />} />,
  // },
  {
    key: 2,
    label: <ActionItemExtension label='Delete' icon={<DeleteOutlined />} />,
  },
]

export const actionMenuExample: ItemType[] = getActionMenuExample(false)

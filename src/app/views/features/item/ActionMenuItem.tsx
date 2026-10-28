import { theme } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  HeartFilled,
  HeartOutlined,
  ReadOutlined,
  StarFilled,
  SyncOutlined,
  CheckSquareOutlined,
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
  const itemStyle: React.CSSProperties = {
    fontSize: token.fontSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  }
  const iconStyle: React.CSSProperties = { marginRight: 8, fontSize: 16 }

  return (
    <div style={itemStyle}>
      <span style={iconStyle}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

export const getActionMenuItem = (data: IItem | undefined, isInChecklist = false): ItemType[] => {
  return [
    {
      key: '0',
      label: <ActionItem label='View' icon={<EyeOutlined />} />,
    },
    {
      key: '1',
      label: <ActionItem label='Edit' icon={<EditOutlined />} />,
    },
    {
      key: '2',
      label: (
        <ActionItem
          label={`${data?.level === 5 ? '0 star' : '5 stars'}`}
          icon={<StarFilled style={{ color: '#faad14' }} />}
        />
      ),
    },
    {
      key: '7',
      label: (
        <ActionItem
          label={data?.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
          icon={
            data?.favorite ? (
              <HeartFilled style={{ color: '#ff4d4f' }} />
            ) : (
              <HeartOutlined />
            )
          }
        />
      ),
    },
    {
      key: '5',
      label: (
        <ActionItem
          label={`${data?.archive ? 'Bỏ lưu trữ (Unarchive)' : 'Lưu trữ (Archive)'}`}
          icon={<ReadOutlined style={{ color: data?.archive ? '#fa8c16' : undefined }} />}
        />
      ),
    },
    {
      key: '8',
      label: (
        <ActionItem
          label={isInChecklist ? 'Xóa khỏi checklist' : 'Thêm vào checklist'}
          icon={<CheckSquareOutlined style={{ color: isInChecklist ? '#52c41a' : undefined }} />}
        />
      ),
    },
    {
      key: '3',
      label: <ActionItem label='Reset' icon={<SyncOutlined />} />,
    },
    {
      type: 'divider',
    },
    {
      key: '4',
      danger: true,
      label: <ActionItem label='Delete' icon={<DeleteOutlined />} />,
    },
  ]
}

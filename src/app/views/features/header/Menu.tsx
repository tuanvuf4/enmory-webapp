import { MenuProps } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

export const addNewType: MenuProps['items'] = [
  {
    key: 'ADD_ITEM',
    label: 'Item',
    icon: <PlusOutlined />,
  },
  {
    key: 'ADD_MEDIA',
    label: 'Media',
    icon: <PlusOutlined />,
  },
  {
    key: 'ADD_BLOG',
    label: 'Blog',
    icon: <PlusOutlined />,
  },
]

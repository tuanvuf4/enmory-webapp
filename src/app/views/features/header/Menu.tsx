import { MenuProps } from 'antd'
import {
  PlusOutlined,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons/lib/icons'

export const menu: MenuProps['items'] = [
  {
    key: 'profile',
    label: 'Profile',
    icon: <UserOutlined />,
  },
  {
    key: 'setting',
    label: 'Setting',
    icon: <SettingOutlined />,
  },
  {
    key: 'logout',
    label: 'Log Out',
    icon: <PoweroffOutlined />,
  },
]

export const addNewType: MenuProps['items'] = [
  {
    key: 'ADD_ITEM',
    label: 'Item',
    icon: <PlusOutlined />,
  },
  {
    key: 'ADD_EXAMPLE',
    label: 'Example',
    icon: <PlusOutlined />,
  },
  {
    key: 'ADD_POST',
    label: 'Post',
    icon: <PlusOutlined />,
  },
  {
    key: 'ADD_MEDIA',
    label: 'Media',
    icon: <PlusOutlined />,
  },
]

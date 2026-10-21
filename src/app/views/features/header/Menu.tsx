import { MenuProps } from 'antd'
import {
  CodeOutlined,
  PlusOutlined,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'

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
  ...(import.meta.env.DEV
    ? [
        {
          key: 'developer',
          label: 'Developer',
          icon: <CodeOutlined />,
        },
      ]
    : []),
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

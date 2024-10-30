import { MenuProps } from 'antd'
import {
  PlusOutlined,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons/lib/icons'

export const items: MenuProps['items'] = [
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
    key: 'addItem',
    label: 'Item',
    icon: <PlusOutlined />,
  },
  {
    key: 'addEx',
    label: 'Example',
    icon: <PlusOutlined />,
  },
]

import { MenuProps } from 'antd'
import { PlusOutlined, PoweroffOutlined } from '@ant-design/icons/lib/icons'

export const menuExtension: MenuProps['items'] = [
  {
    key: 'logout',
    label: 'Log Out',
    icon: <PoweroffOutlined />,
  },
]

// Add-new menu shown in the popup. Mirrors the web app's addNewType keys
// (see ../Menu.tsx) but only exposes the actions the popup actually supports.
export const addNewTypeExtension: MenuProps['items'] = [
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
]

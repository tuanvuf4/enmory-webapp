import { MenuProps } from 'antd'
import { PoweroffOutlined } from '@ant-design/icons/lib/icons'

export const menuExtension: MenuProps['items'] = [
  {
    key: 'logout',
    label: 'Log Out',
    icon: <PoweroffOutlined />,
  },
]

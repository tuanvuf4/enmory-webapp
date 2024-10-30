import { MenuProps } from 'antd'
import { PoweroffOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons/lib/icons'

export const items: MenuProps['items'] = [
  {
    key: 'logout',
    label: 'Log Out',
    icon: <PoweroffOutlined />,
  },
]

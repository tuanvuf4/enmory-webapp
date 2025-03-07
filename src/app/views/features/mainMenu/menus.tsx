import {
  AreaChartOutlined,
  BookOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { type MenuProps } from 'antd'
import { EPageExt } from '@/models/app.model'

export interface IMenus {
  key: string
  icon: React.ReactNode
  label: string
  path: string
}

export const authMenus: MenuProps['items'] = [
  {
    key: '1',
    icon: <HomeOutlined className='icon' />,
    label: 'home',
  },
  {
    key: '4',
    icon: <CustomerServiceOutlined className='icon' />,
    label: 'listening',
  },
  {
    key: '5',
    icon: <BookOutlined className='icon' />,
    label: 'library',
  },
  {
    key: '10',
    icon: <BookOutlined className='icon' />,
    label: 'Example',
  },
  {
    key: '11',
    icon: <CalendarOutlined className='icon' />,
    label: 'Schedule',
  },
  {
    key: '6',
    icon: <AreaChartOutlined className='icon' />,
    label: 'statistic',
  },
  {
    key: '7',
    icon: <InfoCircleOutlined className='icon' />,
    label: 'about',
  },
]

export const menus: MenuProps['items'] = [
  // {
  //   key: '1',
  //   icon: <HomeOutlined className='icon' />,
  //   label: 'Home',
  // },
  {
    key: '2',
    icon: <LoginOutlined className='icon' />,
    label: 'Login',
  },
  {
    key: '3',
    icon: <UserOutlined className='icon' />,
    label: 'Register',
  },
  {
    key: '7',
    icon: <InfoCircleOutlined className='icon' />,
    label: 'about',
  },
]

export const menusExt: MenuProps['items'] = [
  {
    key: EPageExt.ADD,
    icon: <PlusOutlined className='icon' />,
    label: 'Item',
  },
  {
    key: EPageExt.ADD_EX,
    icon: <PlusOutlined className='icon' />,
    label: 'Example',
  },
  {
    key: EPageExt.SEARCH,
    icon: <SearchOutlined className='icon' />,
    label: 'Search',
  },
]

export const keyPaths = [
  {
    key: '1',
    path: '/',
  },
  {
    key: '2',
    path: '/login',
  },
  {
    key: '3',
    path: '/register',
  },
  {
    key: '4',
    path: '/listening',
  },
  {
    key: '5',
    path: '/library',
  },
  {
    key: '6',
    path: '/statistic',
  },
  {
    key: '7',
    path: '/about',
  },
  {
    key: '8',
    path: '/add',
  },
  {
    key: '9',
    path: '/browse',
  },
  {
    key: '10',
    path: '/example',
  },
  {
    key: '11',
    path: '/schedule',
  },
]

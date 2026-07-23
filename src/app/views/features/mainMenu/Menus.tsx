import {
  BookOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  PlusOutlined,
  ReadOutlined,
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

export const menus: MenuProps['items'] = [
  {
    key: '1',
    icon: <HomeOutlined className='icon' />,
    label: 'home',
  },
  {
    key: '5',
    icon: <BookOutlined className='icon' />,
    label: 'library',
  },
  {
    key: '4',
    icon: <CustomerServiceOutlined className='icon' />,
    label: 'listening',
  },
  // {
  //   key: '10',
  //   icon: <ReadOutlined className='icon' />,
  //   label: 'example',
  // },
  {
    key: '12',
    icon: <ReadOutlined className='icon' />,
    label: 'article',
  },
  {
    key: '13',
    icon: <ReadOutlined className='icon' />,
    label: 'posts',
  },
  // {
  //   key: '6',
  //   icon: <AreaChartOutlined className='icon' />,
  //   label: 'statistic',
  // },
  // {
  //   key: '11',
  //   icon: <InfoCircleOutlined className='icon' />,
  //   label: 'About',
  // },
  // {
  //   key: '7',
  //   icon: <InfoCircleOutlined className='icon' />,
  //   label: 'schedule',
  // },
]

export const authMenus: MenuProps['items'] = [
  // {
  //   key: '1',
  //   icon: <HomeOutlined className='icon' />,
  //   label: 'Home',
  // },
  {
    key: '2',
    icon: <LoginOutlined className='icon' />,
    label: 'login',
  },
  {
    key: '3',
    icon: <UserOutlined className='icon' />,
    label: 'register',
  },
  // {
  //   key: '7',
  //   icon: <InfoCircleOutlined className='icon' />,
  //   label: 'schedule',
  // },
  {
    key: '11',
    icon: <InfoCircleOutlined className='icon' />,
    label: 'about',
  },
]

export const menusExt: MenuProps['items'] = [
  {
    key: EPageExt.ADD,
    icon: <PlusOutlined className='icon' />,
    label: 'item',
  },
  {
    key: EPageExt.ADD_EX,
    icon: <PlusOutlined className='icon' />,
    label: 'example',
  },
  {
    key: EPageExt.SEARCH,
    icon: <SearchOutlined className='icon' />,
    label: 'search',
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
    path: '/schedule',
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
    path: '/about',
  },
  {
    key: '12',
    path: '/article',
  },
  {
    key: '13',
    path: '/posts',
  },
]

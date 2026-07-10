import React from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'
import { MainMenu } from '../mainMenu/MainMenu'
import { useSelector } from '@/core/hooks'

export const SideBarMain: React.FC = () => {
  const { isSidebarOpened, drawer } = useSelector((state) => state.setting)

  return (
    <div className='h-full overflow-auto py-4'>
      <div className='capitalize italic text-[32px]'>
        <Link to={'/'} className='flex items-center justify-center p-4'>
          <img src={logo} alt='' className='w-[70px]' />
          {drawer && <span className='ml-4'>Enmory</span>}

          {isSidebarOpened && !drawer && <span className='ml-4'>Enmory</span>}
        </Link>
      </div>

      <MainMenu direction='vertical' />
    </div>
  )
}

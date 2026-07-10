import { Layout } from 'antd'
import { PlayerDock } from '../player/PlayerDock'

export const AppFooter = () => {
  return (
    <Layout.Footer className='relative w-full !p-0 text-center italic'>
      <PlayerDock />
    </Layout.Footer>
  )
}

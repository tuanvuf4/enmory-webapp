import { Layout } from 'antd'
import { PlayerDock } from '../player/PlayerDock'

export const AppFooter = () => {
  return (
    <Layout.Footer className='sticky bottom-0 w-full !p-0 text-center italic'>
      <PlayerDock />
    </Layout.Footer>
  )
}

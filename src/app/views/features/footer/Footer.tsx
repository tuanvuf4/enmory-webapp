import { Layout } from 'antd'
import styles from './footer.module.scss'
import { PlayerDock } from '../player/PlayerDock'

export const AppFooter = () => {
  return (
    <Layout.Footer className={styles.footer}>
      <PlayerDock />
    </Layout.Footer>
  )
}

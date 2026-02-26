import { Layout } from 'antd'
import styles from './style.module.scss'

export const AppFooter = () => {
  return (
    <>
      <Layout.Footer className={styles.footer}>
        <b>Enmory 2023</b>
      </Layout.Footer>
    </>
  )
}

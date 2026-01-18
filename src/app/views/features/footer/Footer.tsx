import { Layout } from 'antd'
import styles from './style'

export const AppFooter = () => {
  const classes = styles()

  return (
    <>
      <Layout.Footer className={classes.footer}>
        <b>Enmory 2023</b>
      </Layout.Footer>
    </>
  )
}

import { Layout, theme } from 'antd'
import styles from './style'

export const AppFooter = () => {
  const { token } = theme.useToken()
  const classes = styles(token)

  return (
    <>
      <Layout.Footer className={classes.footer}>
        <b>Enmory 2023</b>
      </Layout.Footer>
    </>
  )
}

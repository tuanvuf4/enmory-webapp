import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from '@/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    sider: {
      overflow: 'auto',
      height: '100vh',
      position: 'fixed !important',
      left: 0,
      top: 0,
      bottom: 0,
    },
    contentStyle: {
      color: token.colorText,
      // maxHeight: `calc(100vh - 160px)`,
      // overflow: 'auto',
    },
    wrapper: {
      minHeight: '100vh !important',
    },
    main: {
      padding: `0 0 ${token.size * 2}px 0`,
    },
    siteLayout: {
      marginLeft: appStyleConfig.sider.width,
    },
    show: {
      marginLeft: appStyleConfig.sider.widthCollapse,
      transition: 'all 0.2s',
    },
  })()
}

export default styles

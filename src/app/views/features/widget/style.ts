import { createUseStyles } from 'react-jss'
import { appStyleConfig } from '@/style/appStyle'
import { theme } from 'antd'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    widget: {
      marginBottom: `${token.size}px`,
    },
    widgetTitle: {
      textAlign: 'center',
      marginBottom: 0,
      textTransform: 'capitalize',
      padding: `${(token.size / 4) * 3}px ${token.size}px`,
      fontSize: `${token.fontSizeHeading4}px`,
      fontFamily: appStyleConfig.fontFamily.oswald,
      fontWeight: 500,
      letterSpacing: 0.5,
      color: token.colorTextSecondary,
    },
    widgetContent: {
      // background: hex2Rgba(appStyleConfig.itemColorBg, 0.9),
    },
  })()
}

export default styles

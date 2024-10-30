import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from 'src/app/core/utils/style.util'
import { appStyleConfig } from 'src/style/appStyle'

const styles = (token: AliasToken) => {
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

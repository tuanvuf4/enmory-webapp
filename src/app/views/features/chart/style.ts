import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from '@/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    chartItem: {},
    chartTitle: {
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
  })()
}

export default styles

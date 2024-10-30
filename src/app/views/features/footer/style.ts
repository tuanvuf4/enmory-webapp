import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from 'src/style/appStyle'
import { appTheme } from 'src/style/theme'

const styles = (token: AliasToken) => {
  return createUseStyles({
    footer: {
      textAlign: 'center',
      fontSize: `${token.fontSizeHeading5}px !important`,
      background: `${appTheme.components?.Layout?.headerBg} !important`,
      fontStyle: 'italic',
      color: `${appStyleConfig.color.neutral[6]} !important`,
    },
  })()
}

export default styles

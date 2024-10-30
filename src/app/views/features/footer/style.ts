import { createUseStyles } from 'react-jss'
import { appStyleConfig } from '@/style/appStyle'
import { appTheme } from '@/style/theme'
import { theme } from 'antd'

const styles = () => {
  const { token } = theme.useToken()

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

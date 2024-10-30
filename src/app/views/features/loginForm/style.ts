import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from '@/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    loginForm: {
      width: 400,
      maxWidth: '100%',
      margin: `${0}px auto`,
      background: appStyleConfig.color.white[0],
    },
    loginFormHeader: {
      textAlign: 'center',
      // marginBottom: token.size * 4,
      padding: `${token.size * 3}px`,
      background: appStyleConfig.bg.black[0],
      color: token.colorWhite,

      '& img': {
        width: 120,
      },
    },
    loginFormTitle: {
      fontSize: token.fontSizeHeading2,
      fontWeight: 'bold',
      textAlign: 'center',
      margin: `${token.size}px 0 ${token.size}px 0`,
    },
    loginFormContent: {
      padding: `${token.size * 2}px ${token.size * 2}px ${token.size * 4}px`,
    },
    btnSubmit: {
      textAlign: 'center',
      margin: `${token.size}px 0`,

      '& button': {
        borderRadius: `0 !important`,
        letterSpacing: 1,
        fontWeight: `bold !important`,
        textTransform: 'uppercase',
      },
    },
    register: {
      textAlign: 'center',
      color: appStyleConfig.color.neutral[4],

      '& a': {
        marginLeft: token.size / 4,
      },

      '& p': {
        margin: 0,
      },
    },
    otherLoginMethod: {
      position: 'relative',
      textAlign: 'center',
      color: appStyleConfig.color.neutral[4],
      margin: `${token.size}px 0`,

      '&:before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: 1,
        top: '50%',
        left: 0,
        display: 'block',
        background: token.colorPrimary,
        zIndex: 998,
      },

      '& h3': {
        position: 'relative',
        display: 'inline-block',
        padding: `0 ${token.size * 2}px`,
        background: appStyleConfig.color.white[0],
        margin: 0,
        zIndex: 999,
      },
    },
  })()
}

export default styles

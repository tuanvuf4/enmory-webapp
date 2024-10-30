import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    formAction: {
      margin: [token.size * 2, 0, token.size / 2, 0],
      textAlign: 'center',
      // borderTop: `1px solid ${hex2Rgba(token.colorWhite, 0.5)}`,

      '& button': {
        minWidth: 250,
      },
    },
    checkboxGroup: {
      display: 'flex',
      alignItems: 'flex-start',
      flexDirection: 'column',
      gap: token.size / 2,

      '& label': {
        color: `${token.colorWhite} !important`,
      },
    },
    checkbox: {
      '& span': {
        color: `${token.colorWhite} !important`,
      },
    },
    sep: {},
    title: {
      fontWeight: '500',
      fontSize: token.fontSize,
      fontStyle: 'italic',
      margin: 0,
    },
    grTitle: {
      fontSize: token.fontSizeHeading5,
      color: token.colorPrimary,
      fontStyle: 'italic',
      margin: 0,
    },
  })()
}

export default styles

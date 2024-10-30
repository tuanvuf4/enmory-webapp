import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    title: {
      flex: '0 0',
      minWidth: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: token.size / 2,
      fontSize: token.fontSizeHeading5,
    },
    textarea: {
      minWidth: '100%',
      display: 'flex',
      gap: token.size,
      maxHeight: 800,
      overflow: 'auto',
      flexWrap: 'wrap',
    },
    textareaItem: {
      flex: '1 0',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      flexDirection: 'column',
      gap: token.size,
    },
    innerTextarea: {
      padding: token.size / 2,
      background: token.colorBgBase,
      color: `${token.colorTextBase} !important`,
      fontSize: `${token.fontSizeHeading5}px !important`,
      minHeight: 250,
      flex: '1 0',
      minWidth: '100%',

      '&:focus, &:hover': {
        background: `#fff !important`,
      },

      '& p': {
        marginBottom: token.size / 2,
        lineHeight: '1.3em',
      },
    },
    textareaDisable: {
      background: `${token.colorBgBase} !important`,
    },
    fromTablet: {},
    '@media screen and (max-width: 650px)': {
      fromTablet: {
        display: 'none !important',
      },
      textarea: {
        maxHeight: 'none',
        display: 'block',
      },
      innerTextarea: {
        flex: '1 0 100%',
        maxHeight: 250,
        minHeight: 250,
        overflow: 'auto',
      },
      textareaItem: {
        flex: '1 0 100%',
      },
    },
  })()
}

export default styles

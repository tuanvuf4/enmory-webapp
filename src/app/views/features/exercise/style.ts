import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from 'src/app/core/utils/style.util'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    listeningExcercise: {
      color: token.colorWhite,

      '& button:disabled': {
        color: `${hex2Rgba(token.colorWhite, 0.5)} !important`,
      },
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
    transcriptArea: {
      '& textarea:disabled': {
        color: `${hex2Rgba(token.colorWhite, 1)} !important`,
      },
    },
    overviewPlaceholder: {
      padding: token.size,
      background: token.colorBgBase,
      color: token.colorTextBase,
      overflow: 'auto',
      fontSize: token.fontSizeHeading5,
      lineHeight: '2em',
      minWidth: '100%',
      minHeight: '100%',
    },
    title: {
      flex: '0 0',
      minWidth: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: token.size / 2,
      fontSize: token.fontSizeHeading5,
    },
    placeholder: {
      padding: token.size,
      background: token.colorBgBase,
      color: token.colorTextBase,
      maxHeight: 500,
      overflow: 'auto',
      fontSize: token.fontSizeHeading5,
      lineHeight: '2em',

      '& span': {
        fontWeight: 'bold',
        fontStyle: 'italic',
        fontSize: token.fontSizeHeading4,
        cursor: 'pointer',
      },

      '& P': {
        margin: 0,
      },
    },
    inputPos: {
      cursor: 'pointer',
    },
    scrollSM: {},
    '@media screen and (max-width: 650px)': {
      textarea: {
        display: 'block',
      },
      placeholder: {
        maxHeight: 250,
        fontSize: token.fontSize,

        '& span': {
          fontWeight: 'bold',
          fontStyle: 'italic',
          fontSize: token.fontSize,
        },
      },
      scrollSM: {
        maxHeight: 250,
        overflow: 'auto',
      },
    },
  })()
}

export default styles

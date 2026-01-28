import { styleConfig } from '@/style/appStyle'
import { hex2Rgba } from '@/core/utils'
import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    list: {
      '& ul': {
        paddingLeft: token.size,

        '& li': {
          display: 'list-item',
        },
      },
    },
    disableMeaning: {
      border: `1px solid ${styleConfig.color.red[3]} !important`,
    },
    archive: {
      color: `${token.colorTextSecondary} !important`,
      borderColor: `${token.colorTextSecondary} !important`,
      borderRadius: `${token.size / 4}px !important`,
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: 'column',
      height: '100%',
      padding: [
        token.padding / 2,
        (token.padding / 4) * 3,
        token.padding / 2,
        (token.padding / 4) * 3,
      ],
      borderRadius: 4,
      border: 'none',
      boxShadow: `0px 0px 30px 0px ${hex2Rgba('#ffffff', 0.2)}`,
      color: token.colorTextBase,

      '&.active': {
        background: hex2Rgba(styleConfig.itemColorBg, 0.95),
        border: `1px solid ${hex2Rgba(styleConfig.itemColorBg, 0.4)}`,
        color: token.colorWhite,

        '& $translate': {
          color: token.colorTextSecondary,
        },
      },

      '& ul, & ol': {
        paddingLeft: token.size,

        '& p': {
          marginBottom: token.size / 4,
        },
      },

      '& p': {
        marginBottom: token.size / 4,
      },
    },
    contentHead: {
      // marginBottom: token.size / 2,
    },
    meaningItem: {
      border: `1px solid ${styleConfig.color.neutral[0]}`,
      padding: `${token.size / 4}px ${token.size / 2}px`,
      margin: `${token.size / 4}px 0`,
      borderRadius: `0 ${token.size / 4}px ${token.size / 4}px ${token.size / 4}px`,

      '& > *': {
        margin: `${token.size / 4}px 0`,
      },

      '& img': {
        maxWidth: '100%',
        height: 'auto',
      },
    },
    meaningCommon: {
      border: `1px solid ${styleConfig.border.blue[2]}`,
    },
    contentItem: {
      width: '100%',
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      wordBreak: 'break-word',
      minHeight: token.controlHeight,
      gap: token.size / 2,
    },
    btnDelete: {
      flex: '0 0 38px',
    },
    examples: {
      marginBottom: 0,

      '& > ul': {
        marginLeft: '0 !important',
        padding: 0,
      },
    },
    exampleItem: {
      display: 'block',
      padding: `${token.padding / 2}px ${token.padding / 2}px ${token.padding / 2}px 0px`,
      borderTop: `1px solid ${styleConfig.border.red[2]}`,
      '&:first-child': {
        borderBottom: 'none',
      },
    },
    nestedExampleItem: {
      display: 'list-item',
      marginTop: `-1px`,
      padding: `0 0 0 0`,
      lineHeight: '2em',

      '& ul': {
        paddingLeft: 0,

        '& li:before': {
          content: '"\u201C"',
        },

        '& li:after': {
          content: '"\u201D"',
        },
      },

      '& textarea': {
        resize: 'none !important',
        color: `${token.colorWhite} !important`,
        background: 'transparent !important',

        '&:focus': {
          color: `${token.colorWhite} !important`,
          background: 'transparent !important',
        },

        '&:focus-within': {
          color: `${token.colorWhite} !important`,
          background: 'transparent !important',
        },
      },
    },
    origin: {
      display: 'flex',
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: token.size / 4,
      fontSize: token.fontSizeHeading4,
      margin: 0,
      padding: [token.size / 4, 0],
      fontFamily: styleConfig.fontFamily.lato,

      '& span': {
        display: 'block',
      },
    },
    quickView: {
      display: 'flex !important',
      alignItems: 'center !important',
      justifyContent: 'center !important',
      color: `${token.colorWhite} !important`,
    },
    warnTitle: {
      display: 'flex !important',
      alignItems: 'center !important',
      justifyContent: 'center !important',
      color: hex2Rgba(token.colorTextSecondary, 1),
    },
    kindOfWord: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: token.size / 2,
      marginBottom: 0,
      fontWeight: 'normal',
      fontStyle: 'italic',
    },
    date: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: token.size / 4,
      margin: [token.margin / 4, 0],
      fontSize: 11,
      fontWeight: 'normal',
      fontStyle: 'italic',
      width: '100%',
    },
    level: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      fontWeight: 'normal',
      lineHeight: '1em',
      minHeight: token.size * 2,
      margin: [0, 0, 0, 0],
      gap: token.size / 2,
    },
    pronouns: {
      fontWeight: 'normal',
    },
    definition: {
      color: token.colorPrimary,
      fontSize: token.fontSize,
      fontFamily: 'Lora, sans-serif',

      '& li': {
        display: 'list-item',
      },
    },
    translate: {
      color: styleConfig.color.blue[4],
      fontSize: token.fontSize,
      fontFamily: 'Lora, sans-serif',

      '& li': {
        display: 'list-item',
        wordBreak: 'break-word',
      },
    },
    word_family: {
      // color: token.colorWhite,
    },
    audio: {
      display: 'flex',
      gap: token.size / 4,
    },
    audioIcon: {
      // marginRight: token.size / 4,
    },
    note: {
      fontWeight: 'normal',
      fontStyle: 'italic',
      fontSize: 14,
      fontFamily: 'Lora, sans-serif',
      color: styleConfig.color.yellow[5],

      '& ul': {
        paddingLeft: token.size,
      },

      '& li': {
        display: 'list-item',
      },
    },
    grammar: {},
    collocations: {},
    listItem: {
      paddingLeft: token.size,
      fontSize: 13,

      '& li': {
        display: 'list-item',
      },
    },
    accent: {
      // marginRight: token.size / 2,
    },
    btnActions: {
      color: `${token.colorText} !important`,

      '&.active': {
        color: `${token.colorWhite} !important`,
      },

      '& span': {
        fontSize: `${token.fontSizeHeading4}px !important`,
      },
    },
    btnAction: {
      width: '100%',
      textAlign: 'left !important',
    },
  })()
}

export default styles

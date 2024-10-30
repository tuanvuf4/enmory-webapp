import { createUseStyles } from 'react-jss'
import { hex2Rgba } from '@/app/core/utils/style.util'
import { appStyleConfig } from '@/style/appStyle'
import { theme } from 'antd'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    disableMeaning: {
      border: `1px solid ${token['red-4']} !important`,
    },
    btnInactive: {
      background: 'transparent !important',
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
      background: hex2Rgba(appStyleConfig.itemColorBg, 0.95),
      borderRadius: 4,
      border: `1px solid ${hex2Rgba(appStyleConfig.itemColorBg, 0.4)}`,
      boxShadow: `0px 0px 30px 0px ${hex2Rgba('#ffffff', 0.2)}`,
      color: token.colorWhite,

      '&.active': {
        background: 'none',
        border: 'none',
        padding: 0,
        color: token.colorTextBase,

        '& $translate': {
          color: token.colorTextSecondary,
        },
      },
    },
    contentHead: {
      // marginBottom: token.size / 2,
    },
    contentMain: {},
    meaningItem: {
      border: `1px solid ${appStyleConfig.color.neutral[0]}`,
      padding: `${token.size / 4}px ${(token.size / 4) * 3}px`,
      margin: `${token.size / 4}px 0`,
      borderRadius: token.size / 4,

      '& > *': {
        margin: `${token.size / 2}px 0`,
      },
    },
    date: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: token.size / 4,
      margin: [token.margin / 4, 0],
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'italic',
      width: '100%',
    },
    meaningCommon: {
      border: `1px solid ${appStyleConfig.border.blue[2]}`,
    },
    contentItem: {
      width: '100%',
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      wordBreak: 'break-word',
      marginBottom: token.margin / 4,
      minHeight: token.controlHeight,
    },
    btnDelete: {
      flex: '0 0 38px',
    },
    examples: {
      marginBottom: 0,
      '& > ul': {
        marginLeft: 0,
      },
    },
    exampleItem: {
      display: 'block',
      padding: `${token.padding / 2}px ${token.padding / 2}px ${token.padding / 2}px ${
        token.padding * 2
      }px`,
      borderTop: `1px solid ${appStyleConfig.border.red[2]}`,
      '&:first-child': {
        borderBottom: 'none',
      },
    },
    nestedExampleItem: {
      display: 'list-item',
      marginTop: `-1px`,
      padding: `0 0 0 0`,
      lineHeight: '2em',

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
    original: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: token.size / 4,
      fontSize: token.fontSizeHeading5,
      margin: [0, 0, token.size / 2, 0],

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
      justifyContent: 'flex-start',
      gap: token.size / 2,
      marginBottom: token.margin / 4,
      fontWeight: 'normal',
      fontStyle: 'italic',
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
    },
    translate: {
      color: appStyleConfig.color.blue[4],
      fontSize: token.fontSize,
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
      display: 'flex',
      gap: token.size / 4,
      flexWrap: 'wrap',
      rowGap: 0,
      fontSize: 13,
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
      color: `${token.colorWhite} !important`,
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

import { styleConfig } from '@/style/appStyle'
import { hex2Rgba } from '@/core/utils'
import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    exampleOverview: {
      marginBottom: `${token.size}px`,
      background: hex2Rgba(styleConfig.itemColorBg, 0.9),
      borderRadius: 4,
      border: `1px solid ${hex2Rgba(styleConfig.itemColorBg, 0.4)}`,
      boxShadow: `0px 0px 30px 0px ${hex2Rgba('#ffffff', 0.2)}`,
      color: token.colorWhite,
      padding: [token.size, token.size],

      '& form': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: token.size / 2,
      },
    },
    exampleFormAdd: {
      marginBottom: `${token.size}px`,
      background: hex2Rgba(styleConfig.itemColorBg, 0.9),
      borderRadius: 4,
      // border: `1px solid ${hex2Rgba(styleConfig.itemColorBg, 0.4)}`,
      boxShadow: `0px 0px 30px 0px ${hex2Rgba('#ffffff', 0.2)}`,
      color: token.colorWhite,
      padding: [token.size, token.size],

      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: token.size / 2,

      '&.active': {
        background: 'transparent !important',
        color: `${token.colorTextBase} !important`,
        padding: 0,

        '& textarea': {
          color: `${token.colorTextBase} !important`,
          background: 'transparent !important',

          '&:disabled': {
            color: 'transparent !important',
            background: 'transparent !important',
          },
        },
      },

      '& textarea': {
        resize: 'none !important',
        color: `${token.colorWhite} !important`,
        background: 'transparent !important',

        '&:disabled': {
          color: 'transparent !important',
          background: 'transparent !important',
        },
      },
    },
    overviewForm: {
      marginBottom: token.size,
    },
    exampleItemOverride: {
      position: 'relative',
      paddingRight: `${token.size * 5}px !important`,

      '&:first-child': {
        borderTop: 'none',
      },
    },
    btnGroup: {
      position: 'absolute',
      top: '50%',
      right: '0',
      transform: 'translate(0, -50%)',
      zIndex: 99,
    },
    autoSearchInput: {
      flex: `1 0 180px`,
      background: 'transparent !important',

      '& .emr-select-selector': {
        background: 'transparent !important',
        color: `${token.colorWhite} !important`,
      },
    },
    searchExampleInput: {
      background: 'transparent !important',

      '& input': {
        background: 'transparent !important',
        color: `${token.colorWhite} !important`,
      },
    },
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    exampleFormEdit: {},
    exampleSelectedEx: {
      // marginTop: token.size,
      // paddingTop: token.size,
      borderBottom: `1px solid ${styleConfig.border.red[2]}`,
      borderTop: `1px solid ${styleConfig.border.red[2]}`,
      background: hex2Rgba(styleConfig.border.blue[2], 0.15),
    },
  })()
}

export default styles

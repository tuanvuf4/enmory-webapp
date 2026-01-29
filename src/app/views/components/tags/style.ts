import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    tagList: {},
    tagLabel: {
      marginRight: token.size / 4,
    },
    tagItemContainer: {
      display: 'flex',
      fontSize: 13,

      color: 'inherit !important',
      background: 'transparent !important',
      height: 'auto !important',

      '& span': {
        flex: 1,
        display: 'block',
        padding: [2, token.size / 2],
        color: 'inherit',

        '&:hover': {
          color: token.colorPrimary,
          cursor: 'pointer',
        },
      },

      '& button': {
        padding: [token.size / 8, 0],
        background: 'transparent !important',
        border: 'none',
        borderLeft: `1px solid ${token.colorText}`,
        outline: 'none',
        cursor: 'pointer',
        borderRadius: 0,

        '&:hover': {
          background: token.colorPrimary,
        },
      },
    },
    tagItem: {
      display: 'inline-block',
      margin: [token.size / 4, token.size / 4],
      borderRadius: token.size / 4,
      border: `1px solid ${token.colorText}`,

      '&.active': {
        border: `1px solid ${token.colorWhite}`,

        '& button': {
          borderLeft: `1px solid ${token.colorWhite}`,
        },
      },
    },
  })()
}

export default styles

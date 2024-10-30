import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    mainNavMenu: {
      padding: token.size,

      '&.horizontal': {
        '& ul li.emr-menu-item': {
          color: token.colorTextBase,
        },
      },

      '& li': {
        fontWeight: 'bold',
        textTransform: 'capitalize',
        fontSize: 16,
        margin: `0 !important`,
        paddingLeft: `${token.size}px !important`,
        width: '100% !important',

        '& .icon': {
          fontSize: '20px !important',
        },
      },
    },
    horizontalMenu: {
      padding: `0px !important`,
      // display: 'flex',
      // justifyContent: 'center !important',
      width: '100% !important',

      '& ul': {
        display: 'flex',
        height: '100%',
        border: 'none !important',
        width: '100% !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',

        '& li': {
          // color: token.colorTextBase,
          padding: `0 ${token.size}px !important`,
          width: 'auto !important',
          margin: `0 !important`,
          fontSize: 14,

          '&:after': {
            content: 'none !important',
          },
        },
      },
    },
    '@media screen and (min-width: 1025px)': {
      horizontal: {
        '& ul li': {
          padding: `0 ${token.size * 2}px !important`,
        },
      },
    },
  })()
}

export default styles

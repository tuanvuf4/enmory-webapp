import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from '@/core/utils/style.util'
import { styleConfig } from '@/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    header: {
      height: '60px !important',
      minWidth: 320,
      lineHeight: '60px !important',
      borderBottom: `1px solid ${hex2Rgba(styleConfig.border.gray[0], 0.2)}`,
      padding: `0px !important`,
      position: 'sticky',
      top: 0,
      zIndex: 999,

      '& a': {
        color: token.colorTextBase,

        '&:hover': {
          color: token.colorLinkHover,
        },
      },
    },
    rowHeader: {
      margin: `${0}px -${token.size}px !important`,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      objectFit: 'cover',
    },
    logo: {
      textTransform: 'capitalize',
      fontStyle: 'italic',

      '& h1': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: token.colorTextSecondary,
        fontSize: token.fontSizeHeading2,

        '& a': {
          color: token.colorTextSecondary,

          '&:hover': {
            color: token.colorPrimary,
          },
        },
      },

      '& img': {
        width: 70,
      },
    },
    brandName: {
      margin: 0,
      fontFamily: styleConfig.fontFamily.oswald,
      fontStyle: 'normal',

      '& img': {
        display: 'block',
        width: 40,
      },
    },
    logoContainer: {
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    toggleSidebarBtn: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: token.size / 2,
    },
    btnToggle: {
      minWidth: 38,
      paddingInlineStart: `${token.size / 2}px !important`,
      paddingInlineEnd: `${token.size / 2}px !important`,
    },
    btnAddNew: {
      display: 'flex !important',
      alignItems: 'center',
      textTransform: 'uppercase',
      fontWeight: 'bold !important',

      '&:hover span': {
        color: token.colorPrimary,
      },
    },
    userContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
      gap: token.size / 4,
    },
    mainNav: {
      '& ul': {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '& li': {
          padding: `0 ${token.size * 3}px`,
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontSize: `${token.fontSizeHeading5}px`,
        },
      },
    },
    user: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',

      '& button, & button:hover': {
        color: `${token.colorTextBase}`,
      },
    },
    stayUp: {
      '& button': {
        marginLeft: token.size / 2,
        fontWeight: 'bold',
        minWidth: 90,
        borderRadius: `0px !important`,

        '& a': {
          '&:hover': {
            color: 'inherit',
          },
        },
      },
    },
  })()
}

export default styles

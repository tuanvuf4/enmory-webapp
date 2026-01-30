import { createUseStyles } from 'react-jss'
import { gray, volcano, yellow, blue, red, cyan, green, gold, lime } from '@ant-design/colors'
import { hex2Rgba } from '@/core/utils'
import { theme } from 'antd'

export const styleConfig = {
  prefixClassCss: 'emr',
  fontFamily: {
    default: 'Lora, Lato, Oswald, sans-serif',
    lora: 'Lora, arial, sans-serif',
    oswald: 'Oswald, sans-serif',
    lato: 'Lato, sans-serif',
  },
  modal: {
    small: 500,
    medium: 750,
    large: 1000,
  },
  logo: {
    fontSize: 28,
  },
  itemColorBg: '#252734',
  sider: {
    width: 240,
    widthCollapse: 80,
    // background: appTheme.token?.colorBgLayout,
  },
  footer: {
    background: '#fff',
  },
  color: {
    neutral: gray,
    white: ['#fff'],
    blue: blue,
    red: red,
    black: ['#393e46'],
    yellow: yellow,
    gold: gold,
    cyan: cyan,
    green: green,
    lime: lime,
  },
  border: {
    gray: gray,
    red: volcano,
    blue: blue,
  },
  bg: {
    black: ['#393e46'],
  },
}

const globalStyle = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    container: {
      width: 1800,
      margin: 'auto',
      padding: `${0}px ${token.size}px`,
      maxWidth: '100%',
    },
    containerFluid: {
      width: '100%',
      margin: 'auto',
      padding: `${0}px ${token.size}px`,
      maxWidth: '100%',
    },
    innerContainer: {
      background: hex2Rgba(styleConfig.itemColorBg, 0.9),
      color: token.colorWhite,
      padding: token.size,
      width: 800,
      maxWidth: '100%',
      margin: [0, 'auto'],
      boxShadow: `0 0 ${token.size}px 0 ${hex2Rgba(token.colorTextBase, 0.3)}`,
    },
    stickyBar: {
      position: 'sticky',
      top: 60,
      zIndex: 999,
      padding: [token.size / 2, 0],
      background: styleConfig.color.white[0],
      borderBottom: `1px solid ${hex2Rgba(styleConfig.border.gray[0], 0.2)}`,
    },
    bodyContent: {
      margin: `${token.size * 2}px 0`,
    },
    contentPage: {
      padding: [token.size * 2, token.size, token.size * 3],
      background: token.colorBgBase,
    },
    dark: {
      color: token.colorWhite,
      background: hex2Rgba(styleConfig.itemColorBg, 0.9),
    },
    fulHeight: {
      height: '100%',
    },
    fulWidth: {
      width: '100%',
    },
    hidden: {
      display: 'none !important',
    },
    textCenter: {
      textAlign: 'center',
    },
    textLeft: {
      textAlign: 'left',
    },
    pageTitle: {
      color: token.colorTextSecondary,
      margin: [(token.size / 2) * 3, 0],
      letterSpacing: 1,
      fontFamily: styleConfig.fontFamily.oswald,
      textAlign: 'center',
      fontSize: token.fontSizeHeading2,
    },
    dkOnly: {
      display: 'none !important',
    },
    fromTablet: {
      display: 'none !important',
    },
    xsOnly: {
      display: 'none !important',
    },
    toXs: {
      display: 'none !important',
    },
    toSm: {
      display: 'none !important',
    },
    errorMsg: {
      margin: `${token.size / 2}px 0`,
      color: token.colorTextSecondary,
      fontWeight: 'bold',
    },
    referenceBtn: {
      // margin: `${token.size / 4}px ${token.size / 2}px ${token.size / 4}px 0`,
      height: `auto !important`,
      fontSize: 12,
      color: `${styleConfig.color.yellow[0]} !important`,
      background: `${hex2Rgba(styleConfig.color.cyan[7], 0.9)} !important`,
      '&:hover': {
        color: `${styleConfig.color.yellow[4]} !important`,
      },
    },
    '@media screen and (min-width: 768px)': {
      fromTablet: {
        display: 'block !important',
      },
    },
    '@media screen and (max-width: 767px)': {
      xsOnly: {
        display: 'block !important',
      },
    },
    '@media screen and (max-width: 991px)': {
      toSm: {
        display: 'block !important',
      },
    },
    '@media screen and (max-width: 575px)': {
      toXs: {
        display: 'block !important',
      },
    },
    '@media screen and (max-width: 1024px)': {
      xsOnly: {
        display: 'block !important',
      },
    },
    '@media screen and (min-width: 1025px)': {
      dkOnly: {
        display: 'block !important',
      },
    },
  })()
}

export default globalStyle

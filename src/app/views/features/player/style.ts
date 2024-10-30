import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from '@/core/utils/style.util'
import { appStyleConfig } from '@/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    audioPlayer: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexFlow: 'wrap',
      width: 1200,
      maxWidth: '100%',
      margin: `${token.size}px auto`,
      color: token.colorWhite,
      // background: hex2Rgba('#00000', 0.8),
      fontFamily: appStyleConfig.fontFamily.oswald,
      border: `1px solid ${hex2Rgba('#f4f4f4', 0.1)}`,
      borderRadius: token.size / 4,
      boxShadow: `0px 0px 30px 0px ${hex2Rgba('#ffffff', 0.2)}`,
    },
    player: {
      display: 'flex',
      justifyContent: 'space-between',
      flex: '2 0',
      flexDirection: 'column',
      margin: '0 auto',
      gap: token.size,
      minHeight: 380,
      background: `${hex2Rgba('#000000', 0.2)}`,
    },
    tracks: {
      flex: '1 0',
    },
    audioInfo: {
      textAlign: 'center',
      padding: token.size,
    },
    controlAction: {
      padding: token.size,
    },
    audioDetail: {
      flex: '1 0',
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'column',
    },
    title: {
      color: token.colorPrimary,
      fontFamily: appStyleConfig.fontFamily.lora,
      fontSize: token.fontSizeHeading3,
      margin: 0,
      padding: [token.size / 4, token.size / 2],
      // backgroundColor: hex2Rgba('#00000', 0.2),
    },
    author: {
      color: token.colorTextSecondary,
      margin: 0,
      padding: [token.size / 4, token.size / 2],
      fontSize: token.fontSizeHeading4,
      fontWeight: 'normal',
      fontFamily: appStyleConfig.fontFamily.lora,
      // backgroundColor: hex2Rgba('#00000', 0.2),
    },
    description: {
      color: token.colorWhite,
      margin: 0,
      padding: [token.size / 4, token.size / 2],
      fontSize: token.fontSizeHeading5,
      fontWeight: 'normal',
      fontFamily: appStyleConfig.fontFamily.lora,
      // backgroundColor: hex2Rgba('#00000', 0.2),
    },
    iconWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    audioIcon: {
      fontSize: '40px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '80px',
      width: '80px',
      borderRadius: '50%',
      background: '#989898',
    },
    audioImage: {
      // flex: '0 0 200px',
      // background: hex2Rgba('#525252', 0.8),

      '& img': {
        objectFit: 'cover',
        width: '100%',
        height: '100%',
        verticalAlign: 'middle',
      },
    },
    controlsWrapper: {
      display: 'flex',
      flex: '1 0',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: token.size,
    },
    controlOptions: {
      flex: '1 0',
    },
    controls: {
      '& button': {
        border: 'none',
        backgroundColor: 'transparent',
        marginRight: '8px',
        cursor: 'pointer',
      },
    },
    volume: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flex: '1 0',

      '& button': {
        border: 'none',
        backgroundColor: 'transparent',
        marginRight: '8px',
        cursor: 'pointer',
      },
    },
    progress: {
      display: 'flex',
      alignItems: 'center',
      gap: token.size,
      flex: '1 0',
      width: '100%',
      color: token.colorWhite,
      marginTop: token.size,

      '& input': {
        flex: '1 0 auto',
      },
    },
    time: {
      fontSize: token.fontSize,
    },
    tracksTitle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: [token.size / 2, token.size / 4, token.size / 2, token.size],
      borderBottom: `1px solid ${hex2Rgba(token.colorWhite, 0.2)}`,

      '& h2': {
        textTransform: 'capitalize',
        fontSize: token.fontSizeHeading5,
        margin: 0,
      },
    },
    tracksContent: {
      padding: [0, 0, token.size / 2, 0],

      '& ul': {
        maxHeight: 316,
        overflow: 'auto',

        '& li': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: [token.size / 2, token.size / 2, token.size / 2, token.size / 2],
          cursor: 'pointer',
          gap: token.size / 2,

          '&:hover': {
            background: hex2Rgba('#525252', 0.8),
          },
        },
      },
    },
    active: {
      background: hex2Rgba('#525252', 0.8),
    },
    trackTitle: {
      fontSize: token.fontSize,
      fontWeight: 'normal',
      margin: 0,
      lineHeight: '2em',
    },
    selectSrc: {
      [`& .${appStyleConfig.prefixClassCss}-select-selector`]: {
        background: 'transparent !important',
        color: `${token.colorWhite} !important`,
        border: `none !important`,
      },
      [`& .${appStyleConfig.prefixClassCss}-select-selection-item`]: {
        padding: `0 !important`,
      },
    },
    iframeExtSrc: {
      '& iframe': {
        display: 'block',
        minHeight: 380,
        width: '100%',
      },
    },
    quantity: {
      fontSize: token.fontSizeHeading5,
      marginLeft: token.size / 4,
      fontWeight: 400,
      color: token.colorPrimary,
    },
    actionGroup: {
      display: 'flex',
      gap: token.size / 8,
    },
    addTrack: {},

    trackAuthor: {
      color: token.colorPrimary,
    },
    sticky: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: `100vw`,
      background: hex2Rgba(appStyleConfig.itemColorBg, 1),
      zIndex: 999,
    },
    '@media screen and (max-width: 767px)': {
      player: {
        flex: '1 0',
      },
      title: {
        fontSize: token.fontSizeHeading4,
        padding: 0,
      },
      author: {
        fontSize: token.fontSizeHeading5,
        padding: 0,
      },
      description: {
        fontSize: token.fontSizeHeading5,
        padding: 0,
      },
      audioImage: {
        padding: [token.size, 0],
      },
    },
    '@media screen and (max-width: 650px)': {
      audioPlayer: {
        display: 'block',
        margin: `0 auto ${token.size / 2}px`,
        border: 'none',
      },
      player: {
        minHeight: 0,
      },
      audioImage: {
        // padding: 0,
      },
      iframeExtSrc: {
        '& iframe': {
          minHeight: 315,
        },
      },
      controlAction: {},
      progress: {
        marginTop: token.size / 2,
      },
      controlsWrapper: {
        marginTop: 0,
      },
    },
  })()
}

export default styles

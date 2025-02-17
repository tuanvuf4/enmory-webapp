import { appStyleConfig } from '@/style/appStyle'
import { hex2Rgba } from '@/core/utils'
import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    studySet: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexFlow: 'column wrap',
      background: hex2Rgba(appStyleConfig.itemColorBg, 0.95),

      '&:focus-visible, &:focus, &:focus-within': {
        boxShadow: `0 0 ${token.size}px 0 ${hex2Rgba(token.colorTextBase)}`,
      },
    },
    studySeHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${token.size}px`,
      width: '100%',
      textAlign: 'center',
    },
    fib: {
      margin: [token.size * 2, 0, token.size],
    },
    fibQuestion: {
      marginBottom: token.size / 2,
    },
    fibWrapper: {
      padding: 0,
      display: 'inline-block',
      background: token.colorWhite,
      borderRadius: 38,
      boxShadow: `0px 0px 30px 0px ${hex2Rgba('#ffffff', 0.25)} !important`,

      '& > input': {
        borderRadius: `${token.size * 2}px !important`,
        display: `block !important`,
        boxShadow: `0px 0px 30px 0px ${hex2Rgba('#ffffff', 0.25)} !important`,
        fontSize: `${token.fontSizeHeading4}px !important`,
        letterSpacing: 1.1,
        textAlign: 'center',

        '&.correct': {
          border: `2px solid ${token.colorPrimary} !important`,
          color: `${token.colorWhite} !important`,
          background: `${token.colorPrimary} !important`,
          cursor: 'default !important',
        },
        '&.incorrect': {
          border: `2px solid ${token.colorTextSecondary} !important`,
          color: `${token.colorWhite} !important`,
          background: `${token.colorTextSecondary} !important`,
          cursor: 'default !important',
        },
      },
    },
    fibContainer: {
      fontSize: `${token.fontSizeHeading4}px !important`,
      display: 'flex',
      justifyContent: 'center',
    },
    fibInput: {
      display: 'inline-block',
      minWidth: `${token.size}px !important`,
      color: appStyleConfig.color.neutral[1],
      fontSize: `${token.fontSizeHeading3}px !important`,
      background: 'transparent',
      boxShadow: 'none',
      border: 'none',

      '&:focus, &:focus-visible': {
        outline: 'none',
        border: 'none',
        color: `${token.colorWhite} !important`,
      },

      '&::-moz-selection': {
        color: appStyleConfig.color.neutral[1],
        background: 'transparent',
      },

      '&::selection': {
        color: appStyleConfig.color.neutral[1],
        background: 'transparent',
      },

      '&::placeholder': {
        color: appStyleConfig.color.neutral[1],
        background: 'transparent',
      },

      '&:-ms-input-placeholder': {
        color: appStyleConfig.color.neutral[1],
        background: 'transparent',
      },

      '&::-ms-input-placeholder': {
        color: appStyleConfig.color.neutral[1],
        background: 'transparent',
      },
    },
    fibInputActive: {
      color: token.colorWhite,
    },
    studySetBody: {
      padding: `${token.size}px`,
      paddingTop: 0,
      width: '100%',
      textAlign: 'center',
      fontFamily: 'Lora, sans-serif',

      '& h2': {
        fontSize: token.fontSizeHeading2,
        color: token.colorPrimary,
        lineHeight: token.lineHeight,
      },

      '& h3': {
        fontSize: token.fontSizeHeading3,
        color: token.colorWhite,
        marginBottom: token.size / 2,
        lineHeight: token.lineHeight,
      },

      '& h4': {
        fontSize: token.fontSizeHeading4,
        color: appStyleConfig.color.blue[4],
        marginBottom: token.size / 2,
        lineHeight: token.lineHeight,
      },

      '& h5': {
        fontSize: token.fontSizeHeading5,
        color: appStyleConfig.color.yellow[6],
        lineHeight: token.lineHeight,
      },
    },
    progress: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: token.size,
    },
    progressCounter: {
      color: token.colorWhite,
      fontWeight: 'bold',
    },
    mtc: {
      margin: [token.size * 2, 0, token.size / 2],

      '& > ul': {
        width: 600,
        maxWidth: '100%',
        margin: `${token.size}px auto`,
        textAlign: 'left',

        '& li': {
          padding: `${token.size / 4}px ${token.size / 2}px `,
          margin: `${token.size / 4}px 0`,
          border: `2px solid ${hex2Rgba(token.colorWhite, 0.45)}`,
          borderRadius: token.size / 2,
        },

        '& > li': {
          padding: `${(token.size / 4) * 3}px ${(token.size / 4) * 5}px `,
          margin: `${(token.size / 4) * 3}px 0`,
          borderRadius: token.size / 2,
          color: token.colorWhite,
          fontSize: token.fontSizeHeading5,
          border: `2px solid ${hex2Rgba(token.colorWhite, 0.45)}`,
          lineHeight: token.lineHeight,
          cursor: 'pointer',

          '& i': {
            marginLeft: token.size / 2,
            color: token.colorPrimary,
          },

          '&:hover ': {
            border: `2px solid ${token.colorWhite}`,
            color: token.colorWhite,
          },

          '&.active': {
            background: token.colorWhite,
            color: appStyleConfig.itemColorBg,
          },

          '&.correct': {
            border: `2px solid ${token.colorPrimary} !important`,
            background: `${token.colorPrimary} !important`,
            color: token.colorWhite,

            '& i': {
              color: `${token.colorTextBase}`,
              fontWeight: 'bold',
            },
          },

          '&.incorrect': {
            border: `2px solid ${hex2Rgba(token.colorTextSecondary, 0.5)} !important`,
            background: `${hex2Rgba(token.colorTextSecondary, 0.25)} !important`,
            color: token.colorWhite,
          },
        },
      },
    },
    resultReference: {
      textAlign: 'left',
      width: 500,
      maxWidth: '100%',
      marginBottom: `${token.size}px !important`,
    },
    studySetFooter: {
      width: '100%',
      padding: `${token.size}px ${token.size}px`,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexFlow: 'column',
      gap: token.size,
    },
    btnAction: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: token.size,
      marginBottom: token.size,

      '& button': {
        minWidth: ((token.size * 5) / 2) * 3,
        paddingLeft: `${token.size * 2}px !important`,
        paddingRight: `${token.size * 2}px !important`,
      },
    },
    result: {
      fontSize: token.fontSizeHeading2,
      color: token.colorWhite,

      '& h3': {
        margin: 0,
      },
    },
    '@media screen and (max-width: 767px)': {
      mtc: {
        margin: `${token.size}px auto ${token.size / 2}px`,

        '& ul': {
          margin: `0 auto`,

          '& li': {
            padding: `${token.size / 2}px ${(token.size / 4) * 3}px`,
            margin: `${token.size / 2}px 0`,
            fontSize: token.fontSize,
          },
        },
      },
      resultReference: {
        margin: `0 auto`,
      },
      studySeHeader: {
        // padding: `${(token.size / 4) * 3}px ${(token.size / 4) * 3}px`,
      },
      studySetFooter: {
        // padding: `${(token.size / 4) * 3}px ${(token.size / 4) * 3}px`,
      },
      studySetBody: {
        // padding: `${(token.size / 4) * 3}px ${(token.size / 4) * 3}px`,

        '& h5': {
          fontSize: token.fontSize,
          marginBottom: token.size / 4,
        },
        '& h4': {
          fontSize: token.fontSize,
          marginBottom: token.size / 4,
        },
        '& h3': {
          fontSize: token.fontSizeHeading5,
          marginBottom: token.size / 4,
        },
      },
      fib: {
        margin: `${(token.size / 2) * 3}px 0 ${token.size / 2}px`,
      },
      fibInput: {
        minWidth: `${(token.size / 4) * 3}px !important`,
        fontSize: `${token.fontSizeHeading5}px !important`,
      },
      fibQuestion: {
        marginBottom: token.size / 2,
      },
      fibWrapper: {
        '& > input': {
          fontSize: `${token.fontSizeHeading5}px !important`,
        },
      },
    },
  })()
}

export default styles

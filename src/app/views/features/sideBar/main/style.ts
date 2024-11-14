import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from '@/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    aside: {
      padding: `${token.size}px 0`,
      // background: `${appStyleConfig.sider.background} !important`,
      height: '100%',
      overflow: 'auto',
    },
    logo: {
      textTransform: 'capitalize',
      fontSize: `${token.size * 2}px`,
      fontStyle: 'italic',

      '& a': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: token.size,
      },

      '& img': {
        width: 70,
      },
    },
    slogan: {
      color: token.colorWhite,
      padding: `${token.size}px ${token.size * 2}px`,
      textAlign: 'center',

      '& h2': {
        fontSize: token.fontSizeHeading4,
        paddingBottom: token.size * 2,
        borderBottom: `1px solid ${appStyleConfig.border.gray[0]}`,
        margin: 0,
      },

      '& span': {
        fontSize: token.fontSizeHeading2,
      },
    },
    brandName: {
      marginLeft: token.size,
    },
  })()
}

export default styles

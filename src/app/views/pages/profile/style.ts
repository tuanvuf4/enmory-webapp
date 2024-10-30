import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from 'src/app/core/utils/style.util'

const styles = (token: AliasToken) => {
  return createUseStyles({
    firstName: {
      // marginLeft: `${token.size / 2}px`,
      fontSize: token.fontSizeHeading2,
    },
    lastName: {
      marginLeft: `${token.size / 8}px`,
      fontSize: token.fontSizeHeading2,
    },
    avatar: {
      margin: `${token.size / 4}px 0`,
    },
    username: {
      fontSize: token.fontSizeHeading5,
    },
    email: {
      fontSize: token.fontSizeHeading5,
      fontStyle: 'italic',
    },
    inner: {},
    formSetting: {},
  })()
}

export default styles

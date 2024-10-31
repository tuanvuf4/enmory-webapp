import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    warnIcon: {
      fontSize: 14,
      marginLeft: token.size / 2,
      color: token.colorTextSecondary,
    },
  })()
}

export default styles

import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    items: {
      margin: `${token.size}px 0`,
      padding: `${token.size}px 0`,
    },
  })()
}

export default styles

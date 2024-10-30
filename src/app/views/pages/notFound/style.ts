import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    notFound: {
      margin: `${token.size}px 0`,
      textAlign: 'center',
    },
  })()
}

export default styles

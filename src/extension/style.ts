import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from 'src/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    cruForm: {
      padding: (token.size / 4) * 3,
    },
    ext: {
      width: 500,
    },
    loginForm: {
      padding: [token.size * 2, 0],
    },
  })()
}

export default styles

import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

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

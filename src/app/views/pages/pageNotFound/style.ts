import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    notFound: {
      margin: `${token.size}px 0`,
      textAlign: 'center',
    },
  })()
}

export default styles

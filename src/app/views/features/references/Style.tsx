import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    references: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
      gap: token.size / 4,
      margin: `${token.size / 2}px 0`,
    },
  })()
}

export default styles

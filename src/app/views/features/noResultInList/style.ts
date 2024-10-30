import { theme } from 'antd'
import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  })()
}

export default styles

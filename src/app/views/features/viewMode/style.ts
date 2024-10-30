import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    viewOptions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
    },
  })()
}

export default styles

import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from 'src/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    registerForm: {
      width: `600px`,
    },
    label: {
      display: 'block',
      fontWeight: '500',
      marginBottom: token.size / 4,
      color: appStyleConfig.color.neutral[6],
      fontStyle: 'italic',
      fontSize: 13,
    },
    register: {
      textAlign: 'center',
      color: appStyleConfig.color.neutral[4],

      '& p': {
        margin: 0,
      },
    },
  })()
}

export default styles

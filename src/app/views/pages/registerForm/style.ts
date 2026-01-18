import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { styleConfig } from '@/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    registerForm: {
      width: 600,
      maxWidth: '100%',
      margin: `${token.size * 2}px auto`,
      background: styleConfig.color.white[0],
    },
    label: {
      display: 'block',
      fontWeight: '500',
      marginBottom: token.size / 4,
      color: styleConfig.color.neutral[6],
      fontStyle: 'italic',
      fontSize: 13,
    },
    register: {
      textAlign: 'center',
      color: styleConfig.color.neutral[4],

      '& p': {
        margin: 0,
      },
    },
  })()
}

export default styles

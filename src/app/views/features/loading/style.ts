import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    loading: {
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'fixed',
      width: '100%',
      height: '100vh',
      top: 0,
      left: 0,
      zIndex: 999999,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    active: {
      display: 'flex',
    },
    loader: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: token.size / 4,
      zIndex: 999999,
    },
    bar: {
      position: 'relative',
      top: 0,
      left: 0,
      width: '100%',

      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        padding: token.size / 8,
        background: '#72a526',
        animation: 'borealisBar 2s linear infinite',
      },
    },
  })()
}

export default styles

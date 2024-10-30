import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    toolbar: {
      // padding: `${token.size / 2}px 0`,
      position: 'sticky',
      top: 0,
      zIndex: 999,
    },
    toggleForm: {},
    '@media screen and (max-width: 575px)': {
      toggleForm: {
        display: 'none !important',
      },
    },
    btnToggle: {
      height: `38px !important`,
    },
  })()
}

export default styles

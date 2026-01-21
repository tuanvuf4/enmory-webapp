import { createUseStyles } from 'react-jss'

const styles = () => {
  return createUseStyles({
    toolbar: {
      // padding: `${token.size / 2}px 0`,
      position: 'sticky',
      top: 0,
      zIndex: 999,
    },
    btnToggle: {
      height: `38px !important`,
    },
  })()
}

export default styles

import { createUseStyles } from 'react-jss'

const styles = () => {
  return createUseStyles({
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  })()
}

export default styles

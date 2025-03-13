import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    item: {
      margin: `${token.size}px 0`,
      padding: `${token.size}px 0`,

      '& h2': {
        color: token.colorTextSecondary,
        fontSize: token.fontSizeHeading3,
      },

      '& ul': {
        paddingLeft: token.size * 2,
      },

      '& li': {
        fontSize: token.fontSizeHeading5,
        display: 'list-item',
      },
    },
  })()
}

export default styles

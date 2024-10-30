import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from 'src/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    contentStyle: {
      padding: token.size / 2,
      border: `1px solid ${token.colorPrimary}`,
    },
    disableMeaning: {
      border: `1px solid ${token['red-3']}`,
    },
    warnIcon: {
      color: token.colorTextSecondary,
      marginRight: token.size / 2,
    },
    alertIcon: {
      color: appStyleConfig.color.yellow[6],
      marginLeft: token.size / 2,
    },
    action: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: token.size,

      '& button': {
        minWidth: 100,
      },
    },
    itemExisted: {
      padding: `${token.size / 4}px ${0}px`,
      borderBottom: `1px solid ${token.colorPrimary}`,

      '&:last-child': {
        border: 'none',
      },
    },
  })()
}

export default styles

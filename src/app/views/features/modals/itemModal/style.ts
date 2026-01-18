import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { styleConfig } from '@/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    label: {
      color: token.colorWhite,
    },
    showMeaningOption: {
      '& p': {
        margin: 0,
      },
      '& ul': {
        paddingLeft: token.size,

        '& li': {
          display: 'list-item',
          wordBreak: 'break-word',
        },
      },
    },
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
      color: styleConfig.color.yellow[6],
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

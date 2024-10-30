import { theme } from 'antd'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from '@core/utils/style.util'
import { appStyleConfig } from '@/style/appStyle'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    btnInactive: {
      background: 'transparent !important',
      color: `${token.colorTextSecondary} !important`,
      borderColor: `${token.colorTextSecondary} !important`,
    },
    btnActive: {
      background: 'transparent !important',
      color: `${token.colorPrimary} !important`,
      borderColor: `${token.colorPrimary} !important`,
    },
    items: {
      margin: `${token.size}px 0`,
      padding: `${token.size}px 0`,
    },
    stickyBar: {
      position: 'sticky',
      top: 60,
      zIndex: 999,
      background: appStyleConfig.color.white[0],
      borderBottom: `1px solid ${hex2Rgba(appStyleConfig.border.gray[0], 0.2)}`,
    },
    itemTable: {
      background: appStyleConfig.color.white[0],
      margin: `${token.size}px 0px`,
      padding: `${token.size}px`,
      overflow: 'auto',

      '& table': {
        margin: `0 0 ${token.size}px 0px`,
        minWidth: 1200,

        '& tbody tr': {
          borderBottom: `1px solid ${hex2Rgba(appStyleConfig.border.gray[0], 0.2)}`,

          '&:last-child': {
            border: 'none',
          },

          '&:hover': {
            boxShadow: `0 0 ${token.size}px 0 ${hex2Rgba(token.colorTextBase, 0.3)}`,
          },

          '& td:nth-child(2)': {
            cursor: 'pointer',

            '&:hover': {
              color: token.colorLinkHover,
            },
          },
        },

        '& thead tr': {
          borderBottom: `1px solid ${hex2Rgba(appStyleConfig.border.gray[0], 0.2)}`,
        },

        '& td': {
          padding: `${token.size / 2}px`,
          lineHeight: token.lineHeight,
        },

        ' & th': {
          padding: `${token.size / 2}px ${token.size / 2}px ${token.size}px`,
          lineHeight: token.lineHeight,
          fontSize: token.fontSizeHeading5,
        },

        '& thead tr th:nth-child(1)': { width: '5%' },
        '& thead tr th:nth-child(2)': { width: '10%', textAlign: 'left' },
        '& thead tr th:nth-child(3)': { width: '5%' },
        '& thead tr th:nth-child(4)': { width: '5%' },
        '& thead tr th:nth-child(5)': { width: '5%' },
        '& thead tr th:nth-child(6)': { width: '12%', textAlign: 'left' },
        '& thead tr th:nth-child(7)': { width: '15%', textAlign: 'left' },
        '& thead tr th:nth-child(8)': { width: '15%', textAlign: 'left' },
        '& thead tr th:nth-child(9)': { width: '18%' },
        '& thead tr th:nth-child(10)': { width: '10%' },

        '& tbody tr td:nth-child(1)': { width: '5%', textAlign: 'center' },
        '& tbody tr td:nth-child(2)': { width: '10%' },
        '& tbody tr td:nth-child(3)': { width: '5%', textAlign: 'center' },
        '& tbody tr td:nth-child(4)': { width: '5%', textAlign: 'center' },
        '& tbody tr td:nth-child(5)': { width: '5%', textAlign: 'center' },
        '& tbody tr td:nth-child(6)': { width: '12%' },
        '& tbody tr td:nth-child(7)': { width: '15%' },
        '& tbody tr td:nth-child(8)': { width: '15%' },
        '& tbody tr td:nth-child(9)': { width: '18%', textAlign: 'center' },
        '& tbody tr td:nth-child(10)': { width: '10%' },
      },
    },
    btnActions: {
      display: 'flex',
      justifyContent: 'space-evenly',
      alignItems: 'center',
    },
  })()
}

export default styles

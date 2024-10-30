import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    pagination: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: '100%',
      gap: token.size / 2,
    },
    paginationNav: {
      order: 3,

      '& button': {
        borderRadius: `0 !important`,
      },
    },
    paginationSelect: {
      order: 1,
    },
    paginationOverall: {
      order: 2,

      '& button': {
        borderRadius: `0 !important`,
      },
    },
  })()
}

export default styles

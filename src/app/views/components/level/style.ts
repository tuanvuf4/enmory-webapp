import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { styleConfig } from '@/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    rate: {
      fontSize: 'initial !important',

      '& > *': {
        marginInlineEnd: [token.size / 4, '!important'],
      },
    },
    rateItemDefault: {
      color: styleConfig.color.neutral[0],
      fontSize: 14,
    },
    rateItemActive: {
      color: styleConfig.color.yellow[5],
      fontSize: 16,
    },
  })()
}

export default styles

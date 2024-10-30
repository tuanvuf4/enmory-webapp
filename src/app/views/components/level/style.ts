import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { appStyleConfig } from '@/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    rate: {
      fontSize: 'initial !important',

      '& > *': {
        marginInlineEnd: [token.size / 4, '!important'],
      },
    },
    rateItemDefault: {
      color: appStyleConfig.color.neutral[0],
      fontSize: 14,
    },
    rateItemActive: {
      color: appStyleConfig.color.yellow[5],
      fontSize: 16,
    },
  })()
}

export default styles

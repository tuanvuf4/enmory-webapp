import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    chartItem: {},
    chartTitle: {},
  })()
}

export default styles

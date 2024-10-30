import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from 'src/app/core/utils/style.util'
import { appStyleConfig } from 'src/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  })()
}

export default styles

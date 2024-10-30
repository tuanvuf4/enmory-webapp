import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'
import { hex2Rgba } from 'src/app/core/utils/style.util'
import { appStyleConfig } from 'src/style/appStyle'

const styles = (token: AliasToken) => {
  return createUseStyles({
    dictation: {
      padding: [token.size],
      color: token.colorWhite,
      background: hex2Rgba(appStyleConfig.itemColorBg, 0.9),
    },
    dictationTypes: {
      marginBottom: token.size,
    },
  })()
}

export default styles

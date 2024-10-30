import { AliasToken } from 'antd/es/theme/internal'
import { createUseStyles } from 'react-jss'

const styles = (token: AliasToken) => {
  return createUseStyles({
    inputAutoComplete: {
      minWidth: 100,
      marginRight: `${token.margin / 2}px !important`,
    },
    tagPlus: {
      background: token.colorBgContainer,
      borderStyle: 'dashed !important',
      minWidth: 80,
    },
    tag: {
      minHeight: 38,
      minWidth: 110,
      display: 'flex !important',
      justifyContent: 'space-between',
      alignItems: 'center',
      userSelect: 'none',
      marginRight: token.margin / 2,
      fontSize: `${token.fontSize}px !important`,

      '& span': {
        flex: '1 0',
        lineHeight: `36px`,
      },
      '& span.anticon': {
        flex: '0 0',
      },
    },
  })()
}

export default styles

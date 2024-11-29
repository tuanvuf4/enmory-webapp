import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    textEditorWrapper: {
      border: `1px solid ${token.colorBorder}`,
    },
    textEditorToolbar: {
      borderBottom: `1px solid ${token.colorBorder}`,
      padding: token.size / 2,
    },
    textEditorContent: {
      // border: `1px solid ${token.colorBorder}`,
      padding: token.size / 2,
    },
  })()
}

export default styles

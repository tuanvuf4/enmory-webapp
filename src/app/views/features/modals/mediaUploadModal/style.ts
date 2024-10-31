import { theme } from 'antd';
import { createUseStyles } from 'react-jss';

export const styles = () => {
  const { token } = theme.useToken();

  return createUseStyles({
    action: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: token.size,
      gap: token.size,
    },
    texture: {
      flex: 1,

      '& textarea': {
        minHeight: '100% !important',
      },
    },
  })()
}

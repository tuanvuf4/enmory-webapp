import { hex2Rgba } from '@/core/utils'
import { theme } from 'antd'
import { createUseStyles } from 'react-jss'

const styles = () => {
  const { token } = theme.useToken()

  return createUseStyles({
    btnAddNew: {
      display: 'flex !important',
      alignItems: 'center',
      textTransform: 'uppercase',
      fontWeight: 'bold !important',
      borderRadius: `0 !important`,

      '&:hover span': {
        color: token.colorPrimary,
      },
    },
    searchExampleInput: {},
    filterWrapper: {
      display: 'flex',
      // alignItems: 'center',
      justifyContent: 'center',
      flexFlow: 'column',
      gap: token.size / 2,
      width: 150,
      background: token.colorBgBase,
      padding: [token.size / 2, token.size / 2],
      boxShadow: `0 0 ${token.size}px 0 ${hex2Rgba(token.colorTextBase, 0.3)}`,
    },
    groupBtnAction: {
      display: 'flex',
      justifyContent: 'flex-start',
      gap: token.size / 2,
    },
    searchForm: {
      color: token.colorTextBase,

      '& form': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: token.size / 2,
      },
      '& form button': {
        flex: `0 0 auto`,
      },
      '& textarea': {
        resize: 'none !important',
      },
    },
    autoSearchInputGroup: {
      display: 'flex',
      flex: `1 0`,
      fontFamily: 'Lora, sans-serif',
    },
    autoSearchInput: {
      flex: `1 0`,
    },
    padding: {
      padding: token.padding,
    },
    label: {
      display: 'block',
      marginBottom: token.size / 2,
    },
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    btnAdd: {
      position: 'absolute !important',
      top: 0,
      right: token.size / 4,
      borderRadius: `0px !important`,
    },
    '@media screen and (max-width: 767px)': {
      groupBtnAction: {
        justifyContent: 'center',
      },
    },
  })()
}

export default styles

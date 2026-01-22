import { ThemeConfig } from 'antd/es/config-provider'
import { gray } from '@ant-design/colors'
import { styleConfig } from './appStyle'

export const appTheme: ThemeConfig = {
  token: {
    colorWhite: '#f4f4f4',
    colorPrimary: '#72a526',
    colorTextHeading: '#ee4a79',
    colorTextBase: '#333333',
    colorText: gray[6],
    colorTextSecondary: '#ee4a79',
    colorLink: '#72a526',
    colorLinkHover: '#ee4a79',
    colorLinkActive: '#ee4a79',
    colorIcon: '#72a526',
    colorBgLayout: '#333333',
    fontSizeHeading1: 30,
    fontSizeHeading2: 26,
    fontSizeHeading3: 22,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    lineHeightHeading1: 2,
    lineHeightHeading2: 2,
    lineHeightHeading3: 2,
    lineHeightHeading4: 2,
    lineHeightHeading5: 2,
    fontSize: 14,
    controlHeight: 38,
    sizeUnit: 4,
    sizeStep: 4,
    lineHeight: 1.5,
    borderRadius: 2,
    fontFamily: styleConfig.fontFamily.default,
  },
  components: {
    Input: {},
    Modal: {
      fontSizeHeading5: 24,
      // @ts-ignore - contentPadding is valid but not in type definitions
      contentPadding: 12,
      // contentBg: hex2Rgba(styleConfig.itemColorBg, 1),
      headerBg: 'transparent',
      headerPadding: 16,
      // colorText: '#f4f4f4',
    },
    Checkbox: {
      // colorText: styleConfig.color.white[0],
    },
    Layout: {
      headerBg: '#fff',
      bodyBg: '#e8e8e8',
    },
    Drawer: {
      colorBgElevated: '#333', // bg body drawer
    },
    Menu: {
      itemBg: 'transparent',
      itemActiveBg: 'transparent',
      itemHoverBg: 'transparent',
      itemColor: '#f4f4f4',
      itemHoverColor: '#ee4a79',
      itemSelectedColor: '#90C53F',
      itemSelectedBg: 'transparent',
      itemBorderRadius: 4,
      fontFamily: styleConfig.fontFamily.lato,
    },
    Button: {
      padding: 12,
      borderRadius: 4,
    },
  },
}

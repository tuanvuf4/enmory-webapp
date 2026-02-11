import { gray, volcano, yellow, blue, red, cyan, green, gold, lime } from '@ant-design/colors'

export const styleConfig = {
  prefixClassCss: 'emr',
  fontFamily: {
    default: 'Lora, Lato, Oswald, sans-serif',
    lora: 'Lora, arial, sans-serif',
    oswald: 'Oswald, sans-serif',
    lato: 'Lato, sans-serif',
  },
  modal: {
    small: 500,
    medium: 750,
    large: 1000,
  },
  logo: {
    fontSize: 28,
  },
  itemColorBg: '#252734',
  sider: {
    width: 240,
    widthCollapse: 80,
  },
  footer: {
    background: '#fff',
  },
  color: {
    neutral: gray,
    white: ['#fff'],
    blue: blue,
    red: red,
    black: ['#393e46'],
    yellow: yellow,
    gold: gold,
    cyan: cyan,
    green: green,
    lime: lime,
  },
  border: {
    gray: gray,
    red: volcano,
    blue: blue,
  },
  bg: {
    black: ['#393e46'],
  },
}

// Re-export for backward compatibility
export default styleConfig

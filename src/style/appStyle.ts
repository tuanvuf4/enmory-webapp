import { gray, volcano, yellow, blue, red, cyan, green, gold, lime } from '@ant-design/colors'

export const styleConfig = {
  prefixClassCss: 'emr',
  modal: {
    small: 500,
    medium: 750,
    large: 1000,
  },
  logo: {
    fontSize: 28,
  },
  sider: {
    width: 240,
    widthCollapse: 80,
  },
  color: {
    white: '#fff',
    black: '#000',
    gray: gray,
    blue: blue,
    red: red,
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
}

console.log(`*** gray *** `, gray)
console.log(`*** blue *** `, blue)
console.log(`*** red *** `, red)
console.log(`*** volcano *** `, volcano)
console.log(`*** cyan *** `, cyan)
console.log(`*** green *** `, green)
console.log(`*** lime *** `, lime)
console.log(`*** gold *** `, gold)
console.log(`*** yellow *** `, yellow)

// Re-export for backward compatibility
export default styleConfig

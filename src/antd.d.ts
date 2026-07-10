import 'antd'

declare module 'antd/es/theme/interface' {
  export interface AliasToken {
    palette?: {
      gray?: string[]
      blue?: string[]
      red?: string[]
      volcano?: string[]
      cyan?: string[]
      green?: string[]
      lime?: string[]
      gold?: string[]
      yellow?: string[]
      blue?: string[]
    }
    colorBgItem: string
    colorBgWidget: string
    colorWhite: string
    colorBlack: string
  }
}

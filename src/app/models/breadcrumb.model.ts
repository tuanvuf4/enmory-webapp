export interface IBreadscrumbConfig {
  href: string
  label: string
  color: string
}

export interface IPageConfig {
  title: string
  breadcrumbs: IBreadscrumbConfig[]
}

export interface IPagesHeaderConfig {
  [key: string]: IPageConfig
}

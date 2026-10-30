export interface ITag {
  value?: string // mặc định: ''
  name: string
  color?: string // mặc định: #1890ff
  order?: number // mặc định: 1
  created_date?: number
  last_update?: number
}

export const DEFAULT_TAG_COLOR = '#1890ff'
export const DEFAULT_TAG_ORDER = 1
export const DEFAULT_TAG_VALUE = ''

export const normalizeTag = (tag: any, defaultOrder = DEFAULT_TAG_ORDER): ITag | null => {
  if (!tag) return null
  const now = Date.now()

  if (typeof tag === 'string') {
    const trimmed = tag.trim()
    if (!trimmed) return null
    return {
      value: DEFAULT_TAG_VALUE,
      name: trimmed,
      color: DEFAULT_TAG_COLOR,
      order: defaultOrder,
      created_date: now,
      last_update: now,
    }
  }

  const name = String(tag.name || tag.value || '').trim()
  if (!name) return null

  return {
    value: tag.value !== undefined ? String(tag.value) : DEFAULT_TAG_VALUE,
    name,
    color: tag.color ? String(tag.color) : DEFAULT_TAG_COLOR,
    order: typeof tag.order === 'number' ? tag.order : defaultOrder,
    created_date: typeof tag.created_date === 'number' ? tag.created_date : now,
    last_update: typeof tag.last_update === 'number' ? tag.last_update : now,
  }
}

export const normalizeTagList = (list: any[] = []): ITag[] => {
  if (!Array.isArray(list)) return []
  const result: ITag[] = []
  const seenNames = new Set<string>()

  list.forEach((item, index) => {
    const normalized = normalizeTag(item, index + 1)
    if (normalized) {
      const key = normalized.name.toLowerCase()
      if (!seenNames.has(key)) {
        seenNames.add(key)
        result.push(normalized)
      }
    }
  })

  return result
}

export interface ITagEntity {
  id?: string
  uid: string
  value: string
  value_lowercase: string
  created_date: number
  last_update: number
}

export interface ITagDto extends ITag {
  id: string
  value_lowercase: string
}

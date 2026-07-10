import { dateTimeUtils, hex2Rgba } from '@/core/utils'
import { ECategory, IQueryPeriods } from '@/models/item.model'

export const getBgColorByCatId = (id: ECategory, color: string[], opacity = 1) => {
  if (!id) id = ECategory.WORD

  if (id === ECategory.WORD) {
    return hex2Rgba(color[0], opacity)
  }

  if (id === ECategory.PHRASE) {
    return hex2Rgba(color[1], opacity)
  }

  if (id === ECategory.COLLOCATION) {
    return hex2Rgba(color[2], opacity)
  }

  if (id === ECategory.IDIOM) {
    return hex2Rgba(color[3], opacity)
  }

  if (id === ECategory.SLANG) {
    return hex2Rgba(color[4], opacity)
  }

  if (id === ECategory.SENTENCE) {
    return hex2Rgba(color[5], opacity)
  }
}

export const labelPeriods: string[] = [
  // 'Last year',
  'Last 12 months',
  'Last 6 months',
  'Last 3 months',
  'Last month',
  'This month',
]

export const queryPeriods: IQueryPeriods[] = [
  // {
  //   id: 0,
  //   label: labelPeriods[0],
  //   from: dateTimeUtils.getDateFromBeginYear(-1)?.getTime() as number,
  //   to: dateTimeUtils.getDateToEndYear(-1)?.getTime() as number,
  // },
  {
    id: 1,
    label: labelPeriods[1],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-12)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 2,
    label: labelPeriods[2],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-6)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 3,
    label: labelPeriods[3],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-3)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 4,
    label: labelPeriods[4],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-1)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 5,
    label: labelPeriods[5],
    from: dateTimeUtils.getDateFromBeginningOfMonth()?.getTime() as number,
    to: new Date().getTime(),
  },
]

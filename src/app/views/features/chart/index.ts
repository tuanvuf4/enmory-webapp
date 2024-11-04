import { appStyleConfig } from '@/style/appStyle'
import { dateTimeUtils, hex2Rgba } from '@/core/utils'
import { ECategory, IQueryPeriods } from '@/models/item.model'

export const getBgColorByCatId = (id: ECategory, opacity = 1) => {
  if (!id) id = ECategory.WORD

  if (id === ECategory.WORD) {
    return hex2Rgba(appStyleConfig.color.lime[7], opacity)
  }

  if (id === ECategory.PHRASE) {
    return hex2Rgba(appStyleConfig.color.gold[3], opacity)
  }

  if (id === ECategory.COLLOCATION) {
    return hex2Rgba(appStyleConfig.color.cyan[2], opacity)
  }

  if (id === ECategory.IDIOM) {
    return hex2Rgba(appStyleConfig.color.blue[3], opacity)
  }

  if (id === ECategory.SLANG) {
    return hex2Rgba(appStyleConfig.color.neutral[4], opacity)
  }

  if (id === ECategory.SENTENCE) {
    return hex2Rgba(appStyleConfig.color.red[2], opacity)
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
    from: dateTimeUtils.getDateFromBeginingOfMonth(-12)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 2,
    label: labelPeriods[2],
    from: dateTimeUtils.getDateFromBeginingOfMonth(-6)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 3,
    label: labelPeriods[3],
    from: dateTimeUtils.getDateFromBeginingOfMonth(-3)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 4,
    label: labelPeriods[4],
    from: dateTimeUtils.getDateFromBeginingOfMonth(-1)?.getTime() as number,
    to: new Date().getTime() as number,
  },
  {
    id: 5,
    label: labelPeriods[5],
    from: dateTimeUtils.getDateFromBeginingOfMonth()?.getTime() as number,
    to: new Date().getTime(),
  },
]

import { dateTimeUtils, hex2Rgba } from '@/core/utils'
import { ECategory, IQueryPeriods } from '@/models/item.model'

export const DEFAULT_CATEGORY_COLORS = [
  '#10b981', // 0: Word (Emerald Green)
  '#3b82f6', // 1: Phrase (Blue)
  '#06b6d4', // 2: Collocation (Cyan)
  '#8b5cf6', // 3: Idiom (Purple)
  '#f59e0b', // 4: Slang (Amber)
  '#ec4899', // 5: Sentence (Pink)
]

export const LEVEL_COLORS = [
  '#94a3b8', // Level 0: Slate (New)
  '#38bdf8', // Level 1: Sky Blue
  '#34d399', // Level 2: Mint Green
  '#fbbf24', // Level 3: Amber
  '#f97316', // Level 4: Orange
  '#8b5cf6', // Level 5: Purple (Mastered)
]

export const LEVEL_LABELS = [
  'Level 0 (New)',
  'Level 1 (Beginner)',
  'Level 2 (Reviewing)',
  'Level 3 (Intermediate)',
  'Level 4 (Advanced)',
  'Level 5 (Mastered)',
]

export const getBgColorByCatId = (id: ECategory, color?: string[], opacity = 1): string => {
  const cat = id || ECategory.WORD
  const palette = color && color.length >= 6 ? color : DEFAULT_CATEGORY_COLORS

  const getColor = (idx: number) => {
    const raw = palette[idx]
    return raw && raw.startsWith('#') ? raw : DEFAULT_CATEGORY_COLORS[idx]
  }

  switch (cat) {
    case ECategory.WORD:
      return hex2Rgba(getColor(0), opacity)
    case ECategory.PHRASE:
      return hex2Rgba(getColor(1), opacity)
    case ECategory.COLLOCATION:
      return hex2Rgba(getColor(2), opacity)
    case ECategory.IDIOM:
      return hex2Rgba(getColor(3), opacity)
    case ECategory.SLANG:
      return hex2Rgba(getColor(4), opacity)
    case ECategory.SENTENCE:
      return hex2Rgba(getColor(5), opacity)
    default:
      return hex2Rgba(getColor(0), opacity)
  }
}

export const labelPeriods: string[] = [
  'Last 12 months',
  'Last 6 months',
  'Last 3 months',
  'Last month',
  'This month',
]

export const queryPeriods: IQueryPeriods[] = [
  {
    id: 1,
    label: labelPeriods[0],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-12)?.getTime() as number,
    to: new Date().getTime(),
  },
  {
    id: 2,
    label: labelPeriods[1],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-6)?.getTime() as number,
    to: new Date().getTime(),
  },
  {
    id: 3,
    label: labelPeriods[2],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-3)?.getTime() as number,
    to: new Date().getTime(),
  },
  {
    id: 4,
    label: labelPeriods[3],
    from: dateTimeUtils.getDateFromBeginningOfMonth(-1)?.getTime() as number,
    to: new Date().getTime(),
  },
  {
    id: 5,
    label: labelPeriods[4],
    from: dateTimeUtils.getDateFromBeginningOfMonth()?.getTime() as number,
    to: new Date().getTime(),
  },
]

/**
 * Common Chart.js options builder for Ant Design Theme compatibility (light & dark mode)
 */
export const getChartThemeOptions = (token: any, isDark: boolean) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: token.colorText || '#5c648e',
          font: { family: token.fontFamily, size: 12, weight: 500 },
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(23, 27, 69, 0.95)' : 'rgba(255, 255, 255, 0.96)',
        titleColor: isDark ? '#ffffff' : '#1b2252',
        bodyColor: isDark ? '#c8caee' : '#2b3155',
        borderColor: token.colorBorder || 'rgba(130, 115, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: token.colorTextSecondary || '#7a82a8',
          font: { family: token.fontFamily, size: 11 },
        },
      },
      y: {
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: token.colorTextSecondary || '#7a82a8',
          font: { family: token.fontFamily, size: 11 },
          precision: 0,
        },
      },
    },
  }
}

import React, { useEffect, useMemo, useState } from 'react'
import { Skeleton, theme, Empty } from 'antd'
import { TagsOutlined } from '@ant-design/icons'
import styles from '../chart.module.scss'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { statsService, ITagStat } from '@/services/localDb'
import { getChartThemeOptions } from '../data'
import { useSelector } from '@/core/hooks/redux'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface IProps {
  title?: string
}

const TAG_PALETTE = [
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
]

export const TopTagsChart: React.FC<IProps> = ({ title = 'Topics' }) => {
  const [tags, setTags] = useState<ITagStat[]>([])
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const { token } = theme.useToken()
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')
  const reduxTags = useSelector((state: any) => state?.setting?.tags)
  const isDark = themeMode === 'dark'

  const chartOptions = useMemo(() => {
    const base = getChartThemeOptions(token, isDark)
    return {
      ...base,
      indexAxis: 'y' as const,
      plugins: {
        ...base.plugins,
        legend: {
          display: false,
        },
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            label: (ctx: any) => {
              const item = tags[ctx.dataIndex]
              return ` #${item?.tag || ''}: ${ctx.raw} items (${item?.percentage || 0}%)`
            },
          },
        },
      },
      scales: {
        x: {
          ...base.scales.x,
          ticks: {
            ...base.scales.x.ticks,
            precision: 0,
          },
        },
        y: {
          ...base.scales.y,
          grid: {
            display: false,
          },
        },
      },
    }
  }, [token, isDark, tags])

  const chartData = useMemo(() => {
    const labels = tags.map((t) => `#${t.tag}`)
    const counts = tags.map((t) => t.count)
    const backgroundColors = tags.map((_, idx) => TAG_PALETTE[idx % TAG_PALETTE.length] + 'cc')
    const borderColors = tags.map((_, idx) => TAG_PALETTE[idx % TAG_PALETTE.length])

    return {
      labels,
      datasets: [
        {
          label: 'Items',
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    }
  }, [tags])

  useEffect(() => {
    setIsLoaded(false)
    statsService
      .getTopTagsStats(8)
      .then((res) => {
        if (res.isSuccess && res.content) {
          setTags(res.content)
        }
        setIsLoaded(true)
      })
      .catch((err) => {
        console.error('Error fetching top tags:', err)
        setIsLoaded(true)
      })
  }, [reduxTags])

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrapper}>
          <h3 className={styles.chartTitle}>
            <TagsOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>Most frequently topics in your Library</p>
        </div>
      </div>

      <div className={styles.chartBody}>
        {!isLoaded && <Skeleton active paragraph={{ rows: 5 }} />}

        {isLoaded && tags.length === 0 && (
          <div className={styles.emptyState}>
            <Empty
              description='No tags found. Add tags to your vocabulary items to see topic distribution!'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}

        {isLoaded && tags.length > 0 && <Bar options={chartOptions} data={chartData} />}
      </div>
    </div>
  )
}

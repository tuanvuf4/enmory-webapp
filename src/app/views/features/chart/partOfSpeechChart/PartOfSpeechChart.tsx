import React, { useEffect, useMemo, useState } from 'react'
import { Skeleton, theme, Empty } from 'antd'
import { TranslationOutlined } from '@ant-design/icons'
import styles from '../chart.module.scss'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { statsService, IPartOfSpeechStat } from '@/services/localDb'
import { getChartThemeOptions } from '../data'
import { useSelector } from '@/core/hooks/redux'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface IProps {
  title?: string
}

const POS_COLORS: Record<string, string> = {
  Noun: '#3b82f6', // Blue
  Verb: '#10b981', // Green
  Adjective: '#f59e0b', // Amber
  Adverb: '#8b5cf6', // Purple
  Preposition: '#06b6d4', // Cyan
  Conjunction: '#ec4899', // Pink
  Pronoun: '#6366f1', // Indigo
  Interjection: '#f43f5e', // Rose
}

export const PartOfSpeechChart: React.FC<IProps> = ({ title = 'Parts of Speech Distribution' }) => {
  const [stats, setStats] = useState<IPartOfSpeechStat[]>([])
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const { token } = theme.useToken()
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')
  const isDark = themeMode === 'dark'

  const chartOptions = useMemo(() => {
    const base = getChartThemeOptions(token, isDark)
    return {
      ...base,
      indexAxis: 'y' as const, // Horizontal bars
      plugins: {
        ...base.plugins,
        legend: {
          display: false,
        },
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            label: (ctx: any) => {
              const item = stats[ctx.dataIndex]
              return ` ${item?.label || ''}: ${ctx.raw} meanings (${item?.percentage || 0}%)`
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
  }, [token, isDark, stats])

  const chartData = useMemo(() => {
    const labels = stats.map((s) => `${s.label} (${s.abbr})`)
    const counts = stats.map((s) => s.count)
    const backgroundColors = stats.map((s) => (POS_COLORS[s.label] || '#8b5cf6') + 'cc')
    const borderColors = stats.map((s) => POS_COLORS[s.label] || '#8b5cf6')

    return {
      labels,
      datasets: [
        {
          label: 'Count',
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    }
  }, [stats])

  useEffect(() => {
    setIsLoaded(false)
    statsService
      .getPartOfSpeechStats()
      .then((res) => {
        if (res.isSuccess && res.content) {
          setStats(res.content)
        }
        setIsLoaded(true)
      })
      .catch((err) => {
        console.error('Error fetching part of speech stats:', err)
        setIsLoaded(true)
      })
  }, [])

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrapper}>
          <h3 className={styles.chartTitle}>
            <TranslationOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>
            Breakdown of word types (Noun, Verb, Adjective...) in your vocabulary
          </p>
        </div>
      </div>

      <div className={styles.chartBody}>
        {!isLoaded && <Skeleton active paragraph={{ rows: 5 }} />}

        {isLoaded && stats.length === 0 && (
          <div className={styles.emptyState}>
            <Empty
              description='No part of speech data found in item meanings'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}

        {isLoaded && stats.length > 0 && <Bar options={chartOptions} data={chartData} />}
      </div>
    </div>
  )
}

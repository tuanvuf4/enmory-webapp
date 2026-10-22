import React, { useEffect, useMemo, useState } from 'react'
import { Skeleton, theme, Empty } from 'antd'
import { PieChartOutlined } from '@ant-design/icons'
import styles from '../chart.module.scss'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { ECategory } from '@/models/item.model'
import { statsService } from '@/services/localDb'
import { getBgColorByCatId } from '../data'
import { useSelector } from '@/core/hooks/redux'

ChartJS.register(ArcElement, Tooltip, Legend)

interface IProps {
  title?: string
}

export const OverviewChart: React.FC<IProps> = ({ title = 'Category Overview' }) => {
  const [data, setData] = useState<any>()
  const [total, setTotal] = useState<number>(0)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const { token } = theme.useToken()
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')
  const isDark = themeMode === 'dark'

  const settingUI = useMemo(() => {
    const colors = [
      token.palette?.lime?.[7] || '',
      token.palette?.gold?.[3] || '',
      token.palette?.cyan?.[2] || '',
      token.palette?.blue?.[3] || '',
      token.palette?.gray?.[4] || '',
      token.palette?.red?.[2] || '',
    ]
    return {
      backgroundColor: [
        getBgColorByCatId(ECategory.WORD, colors, 0.85),
        getBgColorByCatId(ECategory.PHRASE, colors, 0.85),
        getBgColorByCatId(ECategory.COLLOCATION, colors, 0.85),
        getBgColorByCatId(ECategory.IDIOM, colors, 0.85),
        getBgColorByCatId(ECategory.SLANG, colors, 0.85),
        getBgColorByCatId(ECategory.SENTENCE, colors, 0.85),
      ],
      borderColor: isDark ? 'rgba(23, 27, 69, 0.8)' : '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    }
  }, [token, isDark])

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: token.colorText || '#5c648e',
            font: { family: token.fontFamily, size: 12, weight: 500 },
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(23, 27, 69, 0.95)' : 'rgba(255, 255, 255, 0.96)',
          titleColor: isDark ? '#ffffff' : '#1b2252',
          bodyColor: isDark ? '#c8caee' : '#2b3155',
          borderColor: token.colorBorder || 'rgba(130, 115, 255, 0.2)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context: any) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0
              return ` ${label}: ${value} (${percentage}%)`
            },
          },
        },
      },
    }
  }, [token, isDark, total])

  useEffect(() => {
    // Fetch directly from localDb via statsService
    statsService.getOverviewItems().then(({ content, isSuccess }) => {
      if (isSuccess && content) {
        const sumTotal = content.reduce((acc, item) => acc + item.total, 0)
        setTotal(sumTotal)

        // Only display categories with > 0 items or default if empty
        const activeCategories = content.filter((item) => item.total > 0)
        const displayList = activeCategories.length > 0 ? activeCategories : content

        setData({
          labels: displayList.map((item) => item.label),
          datasets: [
            {
              ...settingUI,
              data: displayList.map((item) => item.total),
            },
          ],
        })
        setIsLoaded(true)
      } else {
        setIsLoaded(true)
      }
    })
  }, [settingUI])

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrapper}>
          <h3 className={styles.chartTitle}>
            <PieChartOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>Active items breakdown by category</p>
        </div>
      </div>

      <div className={styles.chartBody}>
        {!isLoaded && <Skeleton active paragraph={{ rows: 6 }} />}

        {isLoaded && total === 0 && (
          <div className={styles.emptyState}>
            <Empty description='No active items found' image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}

        {isLoaded && total > 0 && data && (
          <>
            <Doughnut data={data} options={chartOptions} />
            <div className={styles.doughnutCenterText}>
              <div className={styles.centerNumber}>{total}</div>
              <div className={styles.centerLabel}>Items</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

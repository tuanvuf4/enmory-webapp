import React, { useEffect, useMemo, useState } from 'react'
import { Skeleton, theme, Radio, Empty } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import styles from '../chart.module.scss'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { statsService } from '@/services/localDb'
import { getBgColorByCatId, getChartThemeOptions, LEVEL_COLORS, LEVEL_LABELS } from '../data'
import { useSelector } from '@/core/hooks/redux'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface IProps {
  title?: string
}

export const ProgressChart: React.FC<IProps> = ({ title = 'Mastery & Level Progress' }) => {
  const [categoryData, setCategoryData] = useState<any>()
  const [levelSummaryData, setLevelSummaryData] = useState<any>()
  const [viewMode, setViewMode] = useState<'category' | 'levelSummary'>('category')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [hasData, setHasData] = useState<boolean>(true)

  const { token } = theme.useToken()
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')
  const isDark = themeMode === 'dark'

  const chartOptions = useMemo(() => {
    const base = getChartThemeOptions(token, isDark)
    return {
      ...base,
      scales: {
        ...base.scales,
        x: {
          ...base.scales.x,
          stacked: viewMode === 'category',
        },
        y: {
          ...base.scales.y,
          stacked: viewMode === 'category',
        },
      },
    }
  }, [token, isDark, viewMode])

  const getChartData = async () => {
    setIsLoaded(false)
    try {
      const { isSuccess, content } = await statsService.getItemsByLevel()
      if (isSuccess && content) {
        const colors = [
          token.palette?.lime?.[7] || '',
          token.palette?.gold?.[3] || '',
          token.palette?.cyan?.[2] || '',
          token.palette?.blue?.[3] || '',
          token.palette?.gray?.[4] || '',
          token.palette?.red?.[2] || '',
        ]

        let totalItems = 0
        const levelTotals = [0, 0, 0, 0, 0, 0]

        // 1. Prepare By Category datasets (stacked)
        const datasets = content.map((value) => {
          value.data.forEach((cnt, lvl) => {
            levelTotals[lvl] += cnt
            totalItems += cnt
          })
          return {
            label: value.label,
            data: value.data,
            borderColor: getBgColorByCatId(value.id, colors),
            backgroundColor: getBgColorByCatId(value.id, colors, 0.8),
            borderRadius: 4,
          }
        })

        setCategoryData({ labels: LEVEL_LABELS, datasets })

        // 2. Prepare By Level summary dataset
        setLevelSummaryData({
          labels: LEVEL_LABELS,
          datasets: [
            {
              label: 'Items in Level',
              data: levelTotals,
              backgroundColor: LEVEL_COLORS.map((c) => c + 'cc'),
              borderColor: LEVEL_COLORS,
              borderWidth: 1.5,
              borderRadius: 6,
            },
          ],
        })

        setHasData(totalItems > 0)
        setIsLoaded(true)
      } else {
        setIsLoaded(true)
        setHasData(false)
      }
    } catch (err) {
      console.error('Error fetching progress chart:', err)
      setIsLoaded(true)
      setHasData(false)
    }
  }

  useEffect(() => {
    getChartData()
  }, [])

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrapper}>
          <h3 className={styles.chartTitle}>
            <TrophyOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>
            {viewMode === 'category'
              ? 'Distribution of active vocabulary across learning levels (Level 0 - Level 5)'
              : 'Total items at each mastery stage'}
          </p>
        </div>

        <div className={styles.chartActions}>
          <Radio.Group
            size='small'
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            optionType='button'
            buttonStyle='solid'
          >
            <Radio.Button value='category'>By Category</Radio.Button>
            <Radio.Button value='levelSummary'>Total By Level</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      <div className={styles.chartBody}>
        {!isLoaded && <Skeleton active paragraph={{ rows: 6 }} />}

        {isLoaded && !hasData && (
          <div className={styles.emptyState}>
            <Empty
              description='No items found to calculate progress levels'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}

        {isLoaded && hasData && viewMode === 'category' && categoryData && (
          <Bar options={chartOptions} data={categoryData} />
        )}

        {isLoaded && hasData && viewMode === 'levelSummary' && levelSummaryData && (
          <Bar options={chartOptions} data={levelSummaryData} />
        )}
      </div>
    </div>
  )
}

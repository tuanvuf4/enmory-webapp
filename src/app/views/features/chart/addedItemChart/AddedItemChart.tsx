import React, { useEffect, useState, useMemo } from 'react'
import { Skeleton, theme, Radio, Empty } from 'antd'
import { RiseOutlined } from '@ant-design/icons'
import styles from '../chart.module.scss'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { getBgColorByCatId, getChartThemeOptions, queryPeriods, labelPeriods } from '../data'
import { statsService } from '@/services/localDb'
import { useSelector } from '@/core/hooks/redux'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

interface IProps {
  title?: string
}

export const AddedItemChart: React.FC<IProps> = ({ title = 'Learning Growth' }) => {
  const [data, setData] = useState<any>()
  const [monthlyData, setMonthlyData] = useState<any>()
  const [viewMode, setViewMode] = useState<'monthly' | 'periods'>('monthly')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [hasData, setHasData] = useState<boolean>(true)

  const { token } = theme.useToken()
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')
  const isDark = themeMode === 'dark'

  const chartOptions = useMemo(() => {
    const base = getChartThemeOptions(token, isDark)
    return {
      ...base,
      plugins: {
        ...base.plugins,
        title: {
          display: false,
        },
      },
      scales: {
        ...base.scales,
        x: {
          ...base.scales.x,
          stacked: viewMode === 'periods',
        },
        y: {
          ...base.scales.y,
          stacked: viewMode === 'periods',
        },
      },
    }
  }, [token, isDark, viewMode])

  const getChartData = async () => {
    setIsLoaded(false)
    try {
      // 1. Fetch period data from localDb
      const periodRes = await statsService.getNewAddedItemByPeriod(queryPeriods)
      // 2. Fetch monthly trend data from localDb
      const monthlyRes = await statsService.getMonthlyGrowthStats(6)

      const colors = [
        token.palette?.lime?.[7] || '',
        token.palette?.gold?.[3] || '',
        token.palette?.cyan?.[2] || '',
        token.palette?.blue?.[3] || '',
        token.palette?.gray?.[4] || '',
        token.palette?.red?.[2] || '',
      ]

      let totalPeriodItems = 0
      if (periodRes.isSuccess && periodRes.content) {
        const datasets = periodRes.content.map((value) => {
          totalPeriodItems += value.data.reduce((a, b) => a + b, 0)
          return {
            label: value.label,
            data: value.data,
            borderColor: getBgColorByCatId(value.id, colors),
            backgroundColor: getBgColorByCatId(value.id, colors, 0.75),
            borderRadius: 4,
          }
        })
        setData({ labels: labelPeriods, datasets })
      }

      if (monthlyRes.isSuccess && monthlyRes.content) {
        const labels = monthlyRes.content.map((m) => m.label)
        const totalCounts = monthlyRes.content.map((m) => m.total)

        setMonthlyData({
          labels,
          datasets: [
            {
              type: 'line' as const,
              label: 'Total Added',
              data: totalCounts,
              borderColor: token.colorPrimary || '#8b6ef7',
              backgroundColor: isDark ? 'rgba(139, 110, 247, 0.15)' : 'rgba(91, 92, 230, 0.12)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: token.colorPrimary || '#8b6ef7',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        })
      }

      setHasData(totalPeriodItems > 0)
      setIsLoaded(true)
    } catch (err) {
      console.error('Failed to load added items chart data:', err)
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
            <RiseOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>
            {viewMode === 'monthly'
              ? 'Vocabulary growth trajectory over the past 6 months'
              : 'Items added across category periods (active items)'}
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
            <Radio.Button value='monthly'>Monthly</Radio.Button>
            <Radio.Button value='periods'>Periods</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      <div className={styles.chartBody}>
        {!isLoaded && <Skeleton active paragraph={{ rows: 6 }} />}

        {isLoaded && !hasData && (
          <div className={styles.emptyState}>
            <Empty
              description='No items created yet. Start adding vocabulary in Library!'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}

        {isLoaded && hasData && viewMode === 'monthly' && monthlyData && (
          <Line options={chartOptions} data={monthlyData} />
        )}

        {isLoaded && hasData && viewMode === 'periods' && data && (
          <Bar options={chartOptions} data={data} />
        )}
      </div>
    </div>
  )
}

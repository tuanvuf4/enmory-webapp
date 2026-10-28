import React, { useEffect, useState, useMemo } from 'react'
import { Skeleton, theme, Empty, Row, Col, Statistic as AntStatistic } from 'antd'
import {
  TranslationOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  FireOutlined,
} from '@ant-design/icons'
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
import { Bar } from 'react-chartjs-2'
import { getChartThemeOptions } from '../data'
import {
  translationStatsService,
  ITranslationSummary,
  ITranslationTimelineData,
} from '@/services/localDb'
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

export const TranslationChart: React.FC<IProps> = ({ title = 'Translator' }) => {
  const { token } = theme.useToken()
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')
  const isDark = themeMode === 'dark'

  const [summary, setSummary] = useState<ITranslationSummary | null>(null)
  const [timeline, setTimeline] = useState<ITranslationTimelineData | null>(null)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    setIsLoaded(false)

    Promise.all([
      translationStatsService.getTranslationSummary(),
      translationStatsService.getTimelineChartData(7),
    ])
      .then(([sumRes, timelineRes]) => {
        if (mounted) {
          setSummary(sumRes)
          setTimeline(timelineRes)
          setIsLoaded(true)
        }
      })
      .catch((err) => {
        console.error('Error loading translation stats:', err)
        if (mounted) setIsLoaded(true)
      })

    return () => {
      mounted = false
    }
  }, [])

  const chartData = useMemo(() => {
    if (!timeline || timeline.labels.length === 0) return null

    return {
      labels: timeline.labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Số câu đã dịch',
          data: timeline.counts,
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          type: 'line' as const,
          label: 'Độ chính xác TB (%)',
          data: timeline.avgAccuracies,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointRadius: 4,
          tension: 0.35,
          yAxisID: 'y1',
        },
      ],
    }
  }, [timeline, isDark])

  const chartOptions = useMemo(() => {
    const base = getChartThemeOptions(token, isDark)
    return {
      ...base,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins?.tooltip,
          callbacks: {
            label: (ctx: any) => {
              if (ctx.dataset.label.includes('Độ chính xác')) {
                return ` ${ctx.dataset.label}: ${ctx.raw}%`
              }
              return ` ${ctx.dataset.label}: ${ctx.raw} câu`
            },
          },
        },
      },
      scales: {
        x: {
          ...base.scales?.x,
          grid: {
            display: false,
          },
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          grid: base.scales?.y?.grid,
          ticks: {
            ...base.scales?.y?.ticks,
            precision: 0,
          },
          title: {
            display: true,
            text: 'Số câu',
            color: token.colorTextSecondary,
            font: { size: 11 },
          },
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: token.colorTextSecondary,
            callback: (v: any) => `${v}%`,
          },
          title: {
            display: true,
            text: 'Độ chính xác',
            color: token.colorTextSecondary,
            font: { size: 11 },
          },
        },
      },
    }
  }, [token, isDark])

  const hasData = (summary?.totalPracticed || 0) > 0

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrapper}>
          <h3 className={styles.chartTitle}>
            <TranslationOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>Thống kê tiến độ luyện dịch câu 7 ngày gần đây</p>
        </div>
      </div>

      {!isLoaded ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={6}>
              <div
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <AntStatistic
                  title={<span style={{ fontSize: 12 }}>Tổng câu đã dịch</span>}
                  value={summary?.totalPracticed || 0}
                  prefix={<TranslationOutlined style={{ color: token.colorPrimary }} />}
                  valueStyle={{ fontSize: 20, fontWeight: 700 }}
                />
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <AntStatistic
                  title={<span style={{ fontSize: 12 }}>Chính xác tuyệt đối</span>}
                  value={summary?.perfectCount || 0}
                  prefix={<TrophyOutlined style={{ color: '#eab308' }} />}
                  valueStyle={{ fontSize: 20, fontWeight: 700 }}
                />
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <AntStatistic
                  title={<span style={{ fontSize: 12 }}>Độ chính xác TB</span>}
                  value={summary?.avgAccuracy || 0}
                  suffix='%'
                  prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                  valueStyle={{ fontSize: 20, fontWeight: 700 }}
                />
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <AntStatistic
                  title={<span style={{ fontSize: 12 }}>Luyện hôm nay</span>}
                  value={summary?.todayCount || 0}
                  prefix={<FireOutlined style={{ color: '#f97316' }} />}
                  valueStyle={{ fontSize: 20, fontWeight: 700 }}
                />
              </div>
            </Col>
          </Row>

          <div className={styles.chartBody} style={{ minHeight: 260 }}>
            {hasData && chartData ? (
              <Bar data={chartData as any} options={chartOptions as any} />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    Chưa có lịch sử luyện dịch câu.
                    <br />
                    Hãy luyện tập với widget <b>Translator</b> trên Trang chủ!
                  </span>
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

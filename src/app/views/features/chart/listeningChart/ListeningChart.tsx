import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Skeleton,
  theme,
  Empty,
  Row,
  Col,
  Statistic as AntStatistic,
  Radio,
  RadioChangeEvent,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  CustomerServiceOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import styles from '../chart.module.scss'
import moment from 'moment'
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
  listeningStatsService,
  IListeningSummary,
  IListeningTimelineData,
  TListeningTimeRange,
  IListeningHistoryItem,
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

export const ListeningChart: React.FC<IProps> = ({ title = 'Dictation' }) => {
  const { token } = theme.useToken()
  const themeMode = useSelector((state: any) => state?.setting?.themeMode ?? 'light')
  const isDark = themeMode === 'dark'
  const user = useSelector((state: any) => state?.auth?.user)
  const uid = user?.uid

  const [summary, setSummary] = useState<IListeningSummary | null>(null)
  const [timeline, setTimeline] = useState<IListeningTimelineData | null>(null)
  const [range, setRange] = useState<TListeningTimeRange>(7)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const loadStats = useCallback(
    (targetRange: TListeningTimeRange) => {
      setIsLoaded(false)
      Promise.all([
        listeningStatsService.getListeningSummary(uid),
        listeningStatsService.getTimelineChartData(targetRange, uid),
      ])
        .then(([sumRes, timelineRes]) => {
          setSummary(sumRes)
          setTimeline(timelineRes)
          setIsLoaded(true)
        })
        .catch((err) => {
          console.error('Error loading listening stats:', err)
          setIsLoaded(true)
        })
    },
    [uid],
  )

  useEffect(() => {
    loadStats(range)

    const handleDictationUpdated = () => {
      loadStats(range)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('enmory:dictation-updated', handleDictationUpdated)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('enmory:dictation-updated', handleDictationUpdated)
      }
    }
  }, [loadStats, range])

  const handleRangeChange = (e: RadioChangeEvent) => {
    const newRange = e.target.value as TListeningTimeRange
    setRange(newRange)
  }

  const rangeSubtitle = useMemo(() => {
    switch (range) {
      case 7:
        return 'Thống kê tiến độ luyện nghe & dictation 7 ngày gần đây'
      case 14:
        return 'Thống kê tiến độ luyện nghe & dictation 14 ngày gần đây'
      case 30:
        return 'Thống kê tiến độ luyện nghe & dictation 30 ngày gần đây'
      default:
        return 'Thống kê tiến độ luyện nghe & dictation'
    }
  }, [range])

  const chartData = useMemo(() => {
    if (!timeline || timeline.labels.length === 0) return null

    return {
      labels: timeline.labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Số câu đã luyện',
          data: timeline.counts,
          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 0.8)',
          borderColor: '#6366f1',
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
          pointRadius: (ctx: any) => (ctx.raw === null || ctx.raw === undefined ? 0 : 4),
          pointHoverRadius: (ctx: any) => (ctx.raw === null || ctx.raw === undefined ? 0 : 6),
          spanGaps: true,
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
              if (ctx.raw === null || ctx.raw === undefined) {
                if (ctx.dataset.label.includes('Độ chính xác')) {
                  return ` ${ctx.dataset.label}: Chưa có lượt luyện`
                }
                return ` ${ctx.dataset.label}: 0 câu`
              }
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

  const recentColumns = useMemo(
    () => [
      {
        title: 'Câu gốc',
        dataIndex: 'sentenceOrigin',
        key: 'sentenceOrigin',
        ellipsis: true,
        render: (text: string) => (
          <Typography.Text strong style={{ fontSize: 13 }}>
            {text || '—'}
          </Typography.Text>
        ),
      },
      {
        title: 'Bạn đã gõ',
        dataIndex: 'userText',
        key: 'userText',
        ellipsis: true,
        render: (text: string) => (
          <Typography.Text type={text ? undefined : 'secondary'} style={{ fontSize: 13 }}>
            {text || '(chưa gõ)'}
          </Typography.Text>
        ),
      },
      {
        title: 'Độ chính xác',
        dataIndex: 'accuracy',
        key: 'accuracy',
        width: 140,
        render: (acc: number, record: IListeningHistoryItem) => {
          const isPerfect = record.isPerfect || acc >= 100
          let color = 'default'
          if (isPerfect) color = 'success'
          else if (acc >= 80) color = 'processing'
          else if (acc >= 50) color = 'warning'
          else color = 'error'

          return (
            <Tag color={color} style={{ fontWeight: 600, borderRadius: 4 }}>
              {isPerfect ? '100% 🏆' : `${acc ?? 0}%`}
            </Tag>
          )
        },
      },
      {
        title: 'Thời gian',
        key: 'time',
        width: 150,
        render: (_: any, record: IListeningHistoryItem) => {
          const ts = record.timestamp || record.created_date
          if (!ts) return record.date || '—'
          return (
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {moment(ts).format('DD/MM/YYYY HH:mm')}
            </span>
          )
        },
      },
    ],
    [token.colorTextSecondary],
  )

  return (
    <div className={styles.chartCard}>
      <div
        className={styles.chartHeader}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div className={styles.chartTitleWrapper}>
          <h3 className={styles.chartTitle}>
            <CustomerServiceOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>{rangeSubtitle}</p>
        </div>

        <Radio.Group value={range} onChange={handleRangeChange} size='small' buttonStyle='solid'>
          <Radio.Button value={7}>7 ngày</Radio.Button>
          <Radio.Button value={14}>14 ngày</Radio.Button>
          <Radio.Button value={30}>30 ngày</Radio.Button>
        </Radio.Group>
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
                  title={<span style={{ fontSize: 12 }}>Tổng câu đã luyện</span>}
                  value={summary?.totalPracticed || 0}
                  prefix={<CustomerServiceOutlined style={{ color: token.colorPrimary }} />}
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
                    Chưa có lịch sử luyện nghe.
                    <br />
                    Hãy luyện tập với tính năng <b>Dictation</b>!
                  </span>
                }
              />
            )}
          </div>

          {summary?.recentSessions && summary.recentSessions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <HistoryOutlined style={{ color: token.colorPrimary }} />
                <Typography.Text strong style={{ fontSize: 14 }}>
                  Lịch sử luyện tập gần đây ({summary.recentSessions.length} câu gần nhất)
                </Typography.Text>
              </div>
              <Table
                dataSource={summary.recentSessions}
                columns={recentColumns}
                rowKey={(record, idx) => String(record.id ?? record.docId ?? idx ?? '')}
                pagination={false}
                size='small'
                bordered={false}
                scroll={{ x: 600 }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

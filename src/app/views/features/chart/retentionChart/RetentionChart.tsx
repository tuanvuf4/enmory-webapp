import React, { useEffect, useState } from 'react'
import { Skeleton, Progress, Empty } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import styles from '../chart.module.scss'
import { statsService, ISummaryStats } from '@/services/localDb'

interface IProps {
  title?: string
}

export const RetentionChart: React.FC<IProps> = ({ title = 'Learning Retention Funnel' }) => {
  const [stats, setStats] = useState<ISummaryStats | null>(null)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  useEffect(() => {
    setIsLoaded(false)
    statsService
      .getSummaryStats()
      .then((res) => {
        if (res.isSuccess && res.content) {
          setStats(res.content)
        }
        setIsLoaded(true)
      })
      .catch((err) => {
        console.error('Error fetching retention stats:', err)
        setIsLoaded(true)
      })
  }, [])

  const activeTotal = stats?.activeItems || 0

  const getPercent = (count: number) => {
    if (!activeTotal) return 0
    return Math.round((count / activeTotal) * 100)
  }

  const stages = [
    {
      label: 'Level 5: Mastered',
      desc: 'Permanent memory',
      count: stats?.masteredL5Items || 0,
      color: '#8b5cf6', // Violet
    },
    {
      label: 'Level 4: Advanced',
      desc: 'Confident recall',
      count: Math.max(0, (stats?.masteredItems || 0) - (stats?.masteredL5Items || 0)),
      color: '#f97316', // Orange
    },
    {
      label: 'Level 1-3: Learning',
      desc: 'Active practice',
      count: stats?.learningItems || 0,
      color: '#3b82f6', // Blue
    },
    {
      label: 'Level 0: New Words',
      desc: 'Awaiting first review',
      count: stats?.newItems || 0,
      color: '#94a3b8', // Slate
    },
  ]

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrapper}>
          <h3 className={styles.chartTitle}>
            <CheckCircleOutlined className={styles.titleIcon} />
            {title}
          </h3>
          <p className={styles.chartSubtitle}>
            Distribution across the 4 stages of long-term memory consolidation
          </p>
        </div>
      </div>

      <div className={styles.chartBody} style={{ alignItems: 'flex-start' }}>
        {!isLoaded && <Skeleton active paragraph={{ rows: 5 }} />}

        {isLoaded && activeTotal === 0 && (
          <div className={styles.emptyState}>
            <Empty
              description='No active items in collection'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}

        {isLoaded && activeTotal > 0 && (
          <div className={styles.retentionFunnel}>
            {stages.map((stage, idx) => {
              const pct = getPercent(stage.count)
              return (
                <div key={idx} style={{ width: '100%' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {stage.label}{' '}
                      <span style={{ fontSize: 11, color: 'var(--ant-color-text-secondary)' }}>
                        ({stage.desc})
                      </span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {stage.count}{' '}
                      <span style={{ fontSize: 11, color: 'var(--ant-color-text-secondary)' }}>
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <Progress
                    percent={pct}
                    strokeColor={stage.color}
                    showInfo={false}
                    size={['100%', 10]}
                    style={{ margin: 0 }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

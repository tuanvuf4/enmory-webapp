import React, { useEffect, useState } from 'react'
import { Col, Row, Skeleton, theme, Tag } from 'antd'
import {
  BookOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  StarOutlined,
  FireOutlined,
} from '@ant-design/icons'
import styles from '../chart.module.scss'
import { statsService, ISummaryStats } from '@/services/localDb'

interface IProps {
  onRefreshReady?: (refreshFn: () => void) => void
}

export const SummaryStats: React.FC<IProps> = ({ onRefreshReady }) => {
  const [stats, setStats] = useState<ISummaryStats | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { token } = theme.useToken()

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const res = await statsService.getSummaryStats()
      if (res.isSuccess && res.content) {
        setStats(res.content)
      }
    } catch (err) {
      console.error('Error loading summary stats from localDb:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    if (onRefreshReady) {
      onRefreshReady(fetchStats)
    }
  }, [])

  if (isLoading || !stats) {
    return (
      <Row gutter={[token.size, token.size]}>
        {[1, 2, 3, 4, 5].map((idx) => (
          <Col xs={12} sm={8} md={12} lg={4} xl={4} key={idx} style={{ flexGrow: 1 }}>
            <div className={styles.statCard}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </div>
          </Col>
        ))}
      </Row>
    )
  }

  const statItems = [
    {
      title: 'Total Vocabulary',
      value: stats.totalItems,
      subtext: `${stats.activeItems} active · ${stats.archivedItems} archived`,
      icon: <BookOutlined />,
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconColor: '#3b82f6',
    },
    {
      title: 'Mastery Rate',
      value: `${stats.masteryRate}%`,
      subtext: `${stats.masteredItems} words mastered (L4-5)`,
      icon: <TrophyOutlined />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#10b981',
      badge: stats.masteredL5Items > 0 ? `${stats.masteredL5Items} L5` : undefined,
    },
    {
      title: 'In Progress',
      value: stats.learningItems,
      subtext: `${stats.newItems} new words waiting`,
      icon: <ThunderboltOutlined />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: '#f59e0b',
    },
    {
      title: 'Starred Items',
      value: stats.favoriteItems,
      subtext: 'Marked as priority',
      icon: <StarOutlined />,
      iconBg: 'rgba(236, 72, 153, 0.12)',
      iconColor: '#ec4899',
    },
    {
      title: 'This Month',
      value: `+${stats.itemsThisMonth}`,
      subtext: `${stats.itemsThisWeek} in past 7 days`,
      icon: <FireOutlined />,
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: '#8b5cf6',
    },
  ]

  return (
    <Row gutter={[token.size, token.size]}>
      {statItems.map((item, index) => (
        <Col
          xs={24}
          sm={12}
          md={8}
          lg={item.badge ? 5 : 4}
          xl={item.badge ? 5 : 4}
          key={index}
          style={{ flexGrow: 1 }}
        >
          <div className={styles.statCard}>
            <div
              className={styles.statIconBox}
              style={{ background: item.iconBg, color: item.iconColor }}
            >
              {item.icon}
            </div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>{item.title}</div>
              <div className={styles.statValue}>
                {item.value}
                {item.badge && (
                  <Tag
                    color='success'
                    style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px' }}
                  >
                    {item.badge}
                  </Tag>
                )}
              </div>
              <div className={styles.statSubtext}>{item.subtext}</div>
            </div>
          </div>
        </Col>
      ))}
    </Row>
  )
}

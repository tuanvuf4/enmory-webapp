import { useState } from 'react'
import { Button, Col, Row, Space, theme } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import {
  AddedItemChart,
  OverviewChart,
  ProgressChart,
  PartOfSpeechChart,
  TopTagsChart,
  SummaryStats,
  RetentionChart,
  ListeningChart,
} from '@/views/features/chart'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'

const Statistic = () => {
  const { token } = theme.useToken()
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setRefreshKey((prev) => prev + 1)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 400)
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <PageTitle content={'Overview'} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
          <Button
            type='default'
            size='middle'
            icon={<ReloadOutlined spin={isRefreshing} />}
            onClick={handleRefresh}
            loading={isRefreshing}
            style={{ borderRadius: 8 }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Space direction='vertical' size={token.size * 1.5} className={appStyle.fulWidth}>
        {/* Top KPI Summary Stats Row */}
        <SummaryStats key={`summary-${refreshKey}`} />

        {/* Row 1: Growth timeline & Category Overview */}
        <Row justify='start' align='stretch' gutter={[token.size * 1.5, token.size * 1.5]}>
          <Col xs={24} lg={15} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <AddedItemChart key={`added-${refreshKey}`} />
            </div>
          </Col>

          <Col xs={24} lg={9} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <OverviewChart key={`overview-${refreshKey}`} />
            </div>
          </Col>
        </Row>

        {/* Row 2: Mastery Level Progress & Retention Funnel */}
        <Row justify='start' align='stretch' gutter={[token.size * 1.5, token.size * 1.5]}>
          <Col xs={24} lg={14} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <ProgressChart key={`progress-${refreshKey}`} />
            </div>
          </Col>

          <Col xs={24} lg={10} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <RetentionChart key={`retention-${refreshKey}`} />
            </div>
          </Col>
        </Row>

        {/* Row 3: Parts of Speech Distribution & Top Tags */}
        <Row justify='start' align='stretch' gutter={[token.size * 1.5, token.size * 1.5]}>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <PartOfSpeechChart key={`pos-${refreshKey}`} />
            </div>
          </Col>

          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <TopTagsChart key={`tags-${refreshKey}`} />
            </div>
          </Col>
        </Row>

        {/* Row 4: Listening & Dictation Practice Analytics */}
        <Row justify='start' align='stretch'>
          <Col xs={24} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <ListeningChart key={`listening-${refreshKey}`} />
            </div>
          </Col>
        </Row>
      </Space>
    </>
  )
}

export default Statistic

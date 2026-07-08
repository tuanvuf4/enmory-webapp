import { Col, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import appStyle from '@/style/appStyle.module.scss'
import { AddedItemChart } from '@/views/features/chart/addedItemChart/AddedItemChart'
import { OverviewChart } from '@/views/features/chart/overviewChart/OverviewChart'
import { ProgressChart } from '@/views/features/chart/progressChart/ProgressChart'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'

const Statistic = () => {
  const { token } = theme.useToken()

  return (
    <div className={appStyle.container}>
      <PageTitle content={'Statistic'} />

      <div className={classNames(appStyle.contentPage)}>
        <Space direction='vertical' size={[token.size, token.size]} className={appStyle.fulWidth}>
          <Row justify={'start'} align={'top'} gutter={[token.size * 2, token.size * 2]}>
            <Col xs={24} md={15}>
              <AddedItemChart />
            </Col>

            <Col xs={24} md={{ span: 7, offset: 2 }}>
              <OverviewChart />
            </Col>

            <Col xs={24} md={24}>
              <ProgressChart />
            </Col>
          </Row>
        </Space>
      </div>
    </div>
  )
}

export default Statistic

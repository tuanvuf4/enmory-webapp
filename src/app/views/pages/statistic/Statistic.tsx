import { Col, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import { AddedItemChart } from '@/views/features/chart/addedItemChart/AddedItemChart'
import { OverviewChart } from '@/views/features/chart/overviewChart/OverviewChart'
import { ProgressChart } from '@/views/features/chart/progressChart/ProgressChart'

const Statistic = () => {
  const { token } = theme.useToken()
  const globalClasses = globalStyle()

  return (
    <div className={globalClasses.container}>
      <h2 className={classNames(globalClasses.pageTitle)}>Statistic</h2>

      <div className={classNames(globalClasses.contentPage)}>
        <Space
          direction='vertical'
          size={[token.size, token.size]}
          className={globalClasses.fulWidth}
        >
          <Row justify={'start'} align={'top'} gutter={[token.size * 2, token.size * 2]}>
            <Col xs={24} md={15}>
              <AddedItemChart />
            </Col>

            <Col
              xs={24}
              md={{
                span: 7,
                offset: 2,
              }}
            >
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

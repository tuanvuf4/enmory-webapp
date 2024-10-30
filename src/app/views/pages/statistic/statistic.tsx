import { Col, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import gStyles from 'src/style/appStyle'
import styles from '../notFound/style'
import { OverviewChart } from '../../features/chart/overviewChart/overviewChart'
import { AddedItemChart } from '../../features/chart/addedItemChart/addedItemChart'
import { ProgressChart } from '../../features/chart/progressChart/progressChart'

const Statistic = () => {
  const { token } = theme.useToken()
  const classes = styles(token)
  const gClasses = gStyles(token)

  return (
    <div className={gClasses.container}>
      <h2 className={classNames(gClasses.pageTitle)}>Statistic</h2>

      <div className={classNames(gClasses.contentPage)}>
        <Space direction='vertical' size={[token.size, token.size]} className={gClasses.fulWidth}>
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

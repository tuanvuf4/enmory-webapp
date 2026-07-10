import { Col, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import appStyle from '@/style/appStyle.module.scss'
import { useSelector } from '@/core/hooks/redux'
import { AddedItemChart } from '@/views/features/chart/addedItemChart/AddedItemChart'
import { OverviewChart } from '@/views/features/chart/overviewChart/OverviewChart'
import { ProgressChart } from '@/views/features/chart/progressChart/ProgressChart'

const Profile = () => {
  const { token } = theme.useToken()

  // User info comes from Firebase auth state
  const { user } = useSelector((state) => state.auth)

  return (
    <div className={appStyle.container}>
      <h2 className={classNames(appStyle.pageTitle)}>Profile</h2>

      <div className={classNames(appStyle.bodyContent)}>
        <Row className={appStyle.innerContainer}>
          <Col xs={24} md={24}>
            <Space direction={'vertical'}>
              <h2>Hello, {user?.firstName + ' ' + user?.lastName}</h2>

              <img src={user?.photoURL} style={{ maxWidth: '200px' }} alt='' />

              <h5 className={'italic'}>{user?.email}</h5>
            </Space>
          </Col>
        </Row>

        <div className={classNames(appStyle.contentPage, 'mt-8')}>
          <Space direction='vertical' size={[token.size, token.size]} className={appStyle.fulWidth}>
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
    </div>
  )
}

export default Profile

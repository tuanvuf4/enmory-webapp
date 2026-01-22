import { Col, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import styles from './style'
import { useSelector } from '@/core/hooks/redux'
import { AddedItemChart } from '@/views/features/chart/addedItemChart/AddedItemChart'
import { OverviewChart } from '@/views/features/chart/overviewChart/OverviewChart'
import { ProgressChart } from '@/views/features/chart/progressChart/ProgressChart'

const Profile = () => {
  const { token } = theme.useToken()

  const classes = styles()
  const globalClasses = globalStyle()

  // User info comes from Firebase auth state
  const { user } = useSelector((state) => state.auth)

  return (
    <div className={globalClasses.container}>
      <h2 className={classNames(globalClasses.pageTitle)}>Profile</h2>

      <div className={classNames(globalClasses.bodyContent)}>
        <Row className={globalClasses.innerContainer}>
          <Col xs={24} md={24}>
            <div className={classes.inner}>
              <div>
                <span className={classes.firstName}>{user?.firstName}</span>{' '}
                <span className={classes.lastName}>{user?.lastName}</span>
              </div>

              <div className={classes.avatar}>
                <img src={user?.photoURL} alt='' />
              </div>
              <div className={classes.email}>{user?.email}</div>
            </div>
          </Col>
        </Row>

        <div className={classNames(globalClasses.contentPage, 'mt-8')}>
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
    </div>
  )
}

export default Profile

import { Col, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import styles from './style'
import { useAppDispatch, useAppSelector } from '@/core/hooks/redux'
import { ManOutlined, WomanOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { actionAsyncUser } from '@/store/async/user'
import { AddedItemChart } from '@/views/features/chart/addedItemChart/addedItemChart'
import { OverviewChart } from '@/views/features/chart/overviewChart/overviewChart'
import { ProgressChart } from '@/views/features/chart/progressChart/progressChart'

const Profile = () => {
  const { token } = theme.useToken()

  const classes = styles()
  const gClasses = globalStyle()

  const { user } = useAppSelector((state) => state.auth)

  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(actionAsyncUser.getUserInfo())
  }, [])

  return (
    <div className={gClasses.container}>
      <h2 className={classNames(gClasses.pageTitle)}>Profile</h2>

      <div className={classNames(gClasses.contentPage)}>
        <Row className={gClasses.innerContainer}>
          <Col xs={24} md={24}>
            <div className={classes.inner}>
              <div>
                <span className={classes.firstName}>{user.firstName}</span>{' '}
                <span className={classes.lastName}>{user.lastName}</span>
              </div>

              <div className={classes.avatar}>{user.avatar}</div>
              <div className={classes.username}>
                <span>{user.username}</span>

                {user.sex && (
                  <ManOutlined
                    style={{
                      color: token.colorPrimary,
                      marginLeft: token.size / 2,
                    }}
                  />
                )}

                {!user.sex && (
                  <WomanOutlined
                    style={{
                      color: token.colorTextSecondary,
                      marginLeft: token.size / 2,
                    }}
                  />
                )}
              </div>
              <div className={classes.email}>{user.email}</div>
              <div className={classes.email}>{user.phoneNumber}</div>
            </div>
          </Col>
        </Row>

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
    </div>
  )
}

export default Profile

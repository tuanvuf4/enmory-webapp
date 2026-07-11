import { Button, Col, Input, message, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import appStyle from '@/style/appStyle.module.scss'
import { useSelector } from '@/core/hooks/redux'
import { AddedItemChart } from '@/views/features/chart/addedItemChart/AddedItemChart'
import { OverviewChart } from '@/views/features/chart/overviewChart/OverviewChart'
import { ProgressChart } from '@/views/features/chart/progressChart/ProgressChart'
import { useState } from 'react'
import { apiAuth } from '@/services/firebase'

const Profile = () => {
  const { token } = theme.useToken()

  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')

  const { user } = useSelector((state) => state.auth)

  const handleEnableEmailPassword = async () => {
    if (!user?.email) {
      message.error('No email available for the current user.')
      return
    }

    if (!password || password.length < 6) {
      message.error('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    try {
      const result = await apiAuth.linkEmailPassword(user.email, password)
      if (result.isSuccess) {
        message.success('Email/password login enabled successfully.')
        setPassword('')
      } else {
        message.error(result.message || 'Failed to enable email/password login.')
      }
    } catch (error: any) {
      console.error('Error enabling email/password login:', error)
      if (error.code === 'auth/provider-already-linked') {
        message.error('This email is already linked to your account.')
        return
      }
      message.error(error.message || 'Failed to enable email/password login.')
    } finally {
      setIsLoading(false)
    }
  }

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

              {user?.provider === 'google' && (
                <Space direction='vertical' style={{ width: '100%' }} size='middle'>
                  <h3>
                    Enable email/password login (Your account is currently signed in with Google.
                    Set a password to allow login with email and password in the future.)
                  </h3>
                  <Row gutter={[16, 16]} align='middle'>
                    <Col xs={24} md={16}>
                      <Input.Password
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='New password'
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Button
                        type='default'
                        onClick={handleEnableEmailPassword}
                        loading={isLoading}
                        style={{ minWidth: '100%' }}
                      >
                        Enable email/password login
                      </Button>
                    </Col>
                  </Row>
                </Space>
              )}
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

import { Button, Col, Input, Row, Space, theme } from 'antd'
import appStyle from '@/style/appStyle.module.scss'
import { useSelector } from '@/core/hooks/redux'
import { AddedItemChart } from '@/views/features/chart/addedItemChart/AddedItemChart'
import { OverviewChart } from '@/views/features/chart/overviewChart/OverviewChart'
import { ProgressChart } from '@/views/features/chart/progressChart/ProgressChart'
import { useState } from 'react'
import { apiAuth } from '@/services/firebase'
import clsx from 'clsx'
import { usePrompt } from '@/helpers/hooks'

const Profile = () => {
  const { message } = usePrompt()
  const { token } = theme.useToken()

  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')

  const { user } = useSelector((state) => state.auth)

  const handleEnableEmailPassword = async () => {
    if (!user?.email) {
      message({ type: 'error', content: 'No email available for the current user.' })
      return
    }

    if (!password || password.length < 6) {
      message({ type: 'error', content: 'Password must be at least 6 characters.' })
      return
    }

    setIsLoading(true)
    try {
      const result = await apiAuth.linkEmailPassword(user.email, password)
      if (result.isSuccess) {
        message({
          type: 'success',
          content: 'Email/password login enabled successfully.',
        })
        setPassword('')
      } else {
        message({
          type: 'error',
          content: result.message || 'Failed to enable email/password login.',
        })
      }
    } catch (error: any) {
      console.error('Error enabling email/password login:', error)
      if (error.code === 'auth/provider-already-linked') {
        message({ type: 'error', content: 'This email is already linked to your account.' })
        return
      }
      message({ type: 'error', content: error.message || 'Failed to enable email/password login.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={appStyle.container}>
      <h2 className={clsx(appStyle.pageTitle)}>Profile</h2>

      <div className={clsx(appStyle.bodyContent)}>
        <Row className={appStyle.innerContainer}>
          <Col xs={24} md={24}>
            <Space direction={'vertical'} size={token.size}>
              <h2
                style={{
                  fontSize: token.fontSizeHeading2,
                  margin: 0,
                }}
              >
                Hello, {user?.firstName + ' ' + user?.lastName}
              </h2>

              <h4
                style={{
                  fontSize: token.fontSizeHeading4,
                  margin: 0,
                }}
              >
                {user?.email}
              </h4>

              <img src={user?.photoURL} style={{ maxWidth: '200px' }} alt='' />

              {user?.provider === 'google' && (
                <Space direction='vertical' style={{ width: '100%' }} size={token.size / 2}>
                  <p style={{ margin: 0 }}>Enable login using the email/password</p>
                  <Row gutter={[token.size / 2, token.size / 2]} align='middle'>
                    <Col xs={24} md={16}>
                      <Input.Password
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='Password'
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Button
                        type='default'
                        onClick={handleEnableEmailPassword}
                        loading={isLoading}
                        style={{ minWidth: '100%' }}
                      >
                        Link account
                      </Button>
                    </Col>
                  </Row>
                </Space>
              )}
            </Space>
          </Col>
        </Row>

        <div className={clsx(appStyle.contentPage, 'mt-8')}>
          <Space
            direction='vertical'
            size={[token.size, token.size]}
            className={clsx(appStyle.fulWidth)}
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

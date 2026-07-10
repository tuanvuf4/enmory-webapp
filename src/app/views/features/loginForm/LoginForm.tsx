import appStyle from '@/style/appStyle.module.scss'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { appConfig, EAppType } from '@/config/appConfig'
import { useFirebaseAuth } from '@/core/hooks'
import { ILogin, IUser } from '@/models/user.model'
import { theme, Space, Row, Col, Input, Button } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'

import logo from '@/assets/img/logo.png'

interface Login {
  onLoginSuccess?: (uid: IUser) => void
  showBanner?: boolean
}

export const LoginForm: React.FC<Login> = ({ onLoginSuccess, showBanner = true }) => {
  const { token } = theme.useToken()

  const { loginWithEmail, loginWithGoogle, isLoading, authError, errorMsg } = useFirebaseAuth({
    onLoginSuccess: onLoginSuccess,
  })

  const { control, handleSubmit } = useForm<ILogin>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: ILogin) => {
    await loginWithEmail(data)
  }

  const handleGoogleLogin = async () => {
    await loginWithGoogle()
  }

  return (
    <div
      style={{
        width: 400,
        maxWidth: '100%',
        margin: '0 auto',
        background: token.colorBgBase,
      }}
    >
      {showBanner && (
        <div
          style={{
            textAlign: 'center',
            padding: token.size * 3,
            background: token.colorBgElevated,
            color: token.colorTextLightSolid,
          }}
        >
          <img src={logo} alt='' style={{ width: 120 }} />
          <h2
            style={{
              fontSize: token.fontSize * 2.5,
              fontWeight: 'bold',
              margin: `${token.size}px 0`,
            }}
          >
            Welcome to Enmory!
          </h2>
        </div>
      )}

      <div style={{ padding: `${token.size * 2}px ${token.size * 2}px ${token.size * 4}px` }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Space direction='vertical' size={[token.size, token.size]} className={appStyle.fulWidth}>
            <Row align={'middle'}>
              <Col span={24}>
                <label htmlFor=''></label>
                <Controller
                  control={control}
                  name={`email`}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      prefix={<UserOutlined />}
                      value={value}
                      onChange={onChange}
                      placeholder='Username or Email'
                      type='text'
                    />
                  )}
                />
              </Col>
            </Row>

            <Row align={'middle'}>
              <Col span={24}>
                <Controller
                  control={control}
                  name={`password`}
                  render={({ field: { onChange, value } }) => (
                    <Input.Password
                      prefix={<LockOutlined />}
                      value={value}
                      onChange={onChange}
                      placeholder='Password'
                    />
                  )}
                />
              </Col>
            </Row>

            {errorMsg && <p style={{ color: token.colorError, textAlign: 'left' }}>{errorMsg}</p>}

            {authError && !errorMsg && (
              <p style={{ color: token.colorError, textAlign: 'center' }}>{authError}</p>
            )}

            <Row justify={'center'}>
              <Col span={24}>
                <div style={{ textAlign: 'center', margin: `${token.size}px 0` }}>
                  <Button
                    className={appStyle.fulWidth}
                    type='primary'
                    htmlType='submit'
                    loading={isLoading}
                    style={{
                      borderRadius: 0,
                      letterSpacing: '1px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </div>
              </Col>
            </Row>

            {appConfig.appType !== EAppType.EXTENSION && (
              <Row justify={'center'}>
                <Col span={24}>
                  <div className={'text-center'}>
                    <p>
                      Don't have a account? <Link to={'/register'}></Link>
                    </p>
                  </div>
                </Col>
              </Row>
            )}

            {/* Google Login Section */}
            <Row justify={'center'}>
              <Col span={24}>
                <div
                  style={{
                    position: 'relative',
                    textAlign: 'center',
                    color: token.colorTextSecondary,
                    margin: `${token.size}px 0`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: 1,
                      top: '50%',
                      left: 0,
                      background: token.colorPrimary,
                      zIndex: 998,
                    }}
                  />
                  <h3
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      padding: `0 ${token.size * 2}px`,
                      background: token.colorBgBase,
                      margin: 0,
                      zIndex: 999,
                    }}
                  >
                    Or continue with
                  </h3>
                </div>
              </Col>
            </Row>

            <Row justify={'center'}>
              <Col span={24}>
                <Button className={appStyle.fulWidth} onClick={handleGoogleLogin}>
                  Google
                </Button>
              </Col>
            </Row>
          </Space>
        </form>
      </div>
    </div>
  )
}

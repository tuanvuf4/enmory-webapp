import appStyle from '@/style/appStyle.module.scss'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { appConfig, EAppType } from '@/config/appConfig'
import { useFirebaseAuth } from '@/core/hooks'
import { ILogin, IUser } from '@/models/user.model'
import { theme, Space, Row, Col, Input, Button } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import styles from './loginForm.module.scss'

import logo from '@/assets/img/logo.png'
import clsx from 'clsx'

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
    <div className={styles.loginForm}>
      {showBanner && (
        <div className={styles.loginFormHeader}>
          <img src={logo} alt='' />
          <h2 className={styles.loginFormTitle}>Welcome to Enmory!</h2>
        </div>
      )}

      <div className={styles.loginFormContent}>
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

            {errorMsg && <p className={clsx(appStyle.errorMsg, appStyle.textLeft)}>{errorMsg}</p>}

            {authError && !errorMsg && (
              <p className={clsx(appStyle.errorMsg, appStyle.textCenter)}>{authError}</p>
            )}

            <Row justify={'center'}>
              <Col span={24}>
                <div className={clsx(styles.btnSubmit)}>
                  <Button
                    className={appStyle.fulWidth}
                    type='primary'
                    htmlType='submit'
                    loading={isLoading}
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
                <div className={styles.otherLoginMethod}>
                  <h3>Or continue with</h3>
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

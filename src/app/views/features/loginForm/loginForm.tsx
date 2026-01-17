import globalStyle from '@/style/appStyle'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { appConfig, EAppType } from '@/config/appConfig'
import { useFirebaseAuth } from '@/core/hooks'
import { IHttpResponse } from '@/models/http.model'
import { ILoginResponse, ILogin } from '@/models/user.model'
import { theme, Space, Row, Col, Input, Button } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import styles from './style'

import logo from '@/assets/img/logo.png'
import clsx from 'clsx'

interface Login {
  onLogin?: (payload: IHttpResponse<ILoginResponse>) => void
  showBanner?: boolean
}

export const LoginForm: React.FC<Login> = ({ onLogin, showBanner = true }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const {
    login,
    loginWithGoogle,
    errorMsg,
    isLoading: firebaseLoading,
    firebaseError,
  } = useFirebaseAuth({ onLoginSuccess: onLogin })

  const { control, handleSubmit } = useForm<ILogin>({
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: ILogin) => {
    await login(data)
  }

  const handleGoogleLogin = async () => {
    await loginWithGoogle()
  }

  return (
    <div className={classes.loginForm}>
      {showBanner && (
        <div className={classes.loginFormHeader}>
          <img src={logo} alt='' />
          <h2 className={classes.loginFormTitle}>Welcome to Enmory!</h2>
        </div>
      )}

      <div className={classes.loginFormContent}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Space direction='vertical' size={[token.size, token.size]} className={gClasses.fulWidth}>
            <Row align={'middle'}>
              <Col span={24}>
                <label htmlFor=''></label>
                <Controller
                  control={control}
                  name={`username`}
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

            {/* {errorMsg && <p className={clsx(gClasses.errorMsg, gClasses.textLeft)}>{errorMsg}</p>} */}

            {firebaseError && (
              <p className={clsx(gClasses.errorMsg, gClasses.textCenter)}>{firebaseError}</p>
            )}

            <Row justify={'center'}>
              <Col span={24}>
                <div className={clsx(classes.btnSubmit)}>
                  <Button
                    className={gClasses.fulWidth}
                    type='primary'
                    htmlType='submit'
                    loading={firebaseLoading}
                  >
                    {firebaseLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </div>
              </Col>
            </Row>

            {appConfig.appType !== EAppType.EXTENSION && (
              <Row justify={'center'}>
                <Col span={24}>
                  <div className={classes.register}>
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
                <div className={classes.otherLoginMethod}>
                  <h3>Or continue with</h3>
                </div>
              </Col>
            </Row>

            <Row justify={'center'}>
              <Col span={24}>
                <Button className={gClasses.fulWidth} onClick={handleGoogleLogin}>
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

import globalStyle from '@/style/appStyle'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { appConfig, EAppType } from '@/config/appConfig'
import { useFirebaseAuth } from '@/core/hooks'
import { ILogin, IUser } from '@/models/user.model'
import { theme, Space, Row, Col, Input, Button } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import styles from './style'

import logo from '@/assets/img/logo.png'
import clsx from 'clsx'

interface Login {
  onLoginSuccess?: (userId: IUser) => void
  showBanner?: boolean
}

export const LoginForm: React.FC<Login> = ({ onLoginSuccess, showBanner = true }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const globalClasses = globalStyle()

  const { loginWithEmail, loginWithGoogle, isLoading, authError } = useFirebaseAuth({
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
    <div className={classes.loginForm}>
      {showBanner && (
        <div className={classes.loginFormHeader}>
          <img src={logo} alt='' />
          <h2 className={classes.loginFormTitle}>Welcome to Enmory!</h2>
        </div>
      )}

      <div className={classes.loginFormContent}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Space
            direction='vertical'
            size={[token.size, token.size]}
            className={globalClasses.fulWidth}
          >
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

            {/* {errorMsg && <p className={clsx(globalClasses.errorMsg, globalClasses.textLeft)}>{errorMsg}</p>} */}

            {authError && (
              <p className={clsx(globalClasses.errorMsg, globalClasses.textCenter)}>{authError}</p>
            )}

            <Row justify={'center'}>
              <Col span={24}>
                <div className={clsx(classes.btnSubmit)}>
                  <Button
                    className={globalClasses.fulWidth}
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
                  <div className={classes.register}>
                    <p>
                      Don't have a account? <Link to={'/Register'}></Link>
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
                <Button className={globalClasses.fulWidth} onClick={handleGoogleLogin}>
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

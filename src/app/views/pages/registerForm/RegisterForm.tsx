import { Button, Col, Input, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import globalStyle from '@/style/appStyle'
import { appConfig, EAppType } from '@/config/appConfig'
import { IUser } from '@/models/user.model'
import { initRegisterForm } from '@/services/registerForm'
import { useFirebaseAuth } from '@/core/hooks'

import logo from '@/assets/img/logo.png'
import styles from './style'
import loginStyle from '../login/style'

export const RegisterForm = ({ showBanner = true }) => {
  const { token } = theme.useToken()
  const classesLogin = loginStyle()
  const classes = styles()
  const globalClasses = globalStyle()

  const {
    register: registerUser,
    loginWithGoogle,
    errorMsg,
    isLoading: firebaseLoading,
    authError,
    isRegistered,
    registerSuccess,
    registerMsg,
    setIsRegistered,
  } = useFirebaseAuth()

  const { control, handleSubmit, watch } = useForm<IUser>({
    defaultValues: initRegisterForm,
    reValidateMode: 'onChange',
    mode: 'all',
  })

  const handleOk = async (data: IUser) => {
    await registerUser(data)
  }

  const handleGoogleLogin = async () => {
    await loginWithGoogle()
  }

  return (
    <div className={classNames([classes.registerForm])}>
      {showBanner && (
        <div className={classesLogin.loginFormHeader}>
          <img src={logo} alt='' />
          <h2 className={classesLogin.loginFormTitle}>Welcome to Enmory!</h2>
        </div>
      )}

      <div className={classesLogin.loginFormContent}>
        {!isRegistered && (
          <form onSubmit={handleSubmit(handleOk)}>
            <Space
              direction='vertical'
              size={[token.size, token.size]}
              className={globalClasses.fulWidth}
            >
              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={24}>
                  <label className={classes.label} htmlFor=''>
                    Email:
                  </label>
                  <Controller
                    name={`email`}
                    rules={{
                      required: 'Email is required',
                    }}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <>
                        <Input
                          value={value}
                          onChange={onChange}
                          placeholder='Email'
                          status={error ? 'error' : ''}
                        />
                        {error && (
                          <span style={{ color: 'red', fontSize: '12px' }}>{error.message}</span>
                        )}
                      </>
                    )}
                  />
                </Col>
              </Row>

              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Password:
                  </label>
                  <Controller
                    name={`password`}
                    control={control}
                    rules={{
                      required: 'Password is required',
                    }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <>
                        <Input.Password
                          value={value}
                          onChange={onChange}
                          placeholder='Password'
                          status={error ? 'error' : ''}
                          iconRender={(visible) =>
                            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                          }
                        />
                        {error && (
                          <span style={{ color: 'red', fontSize: '12px' }}>{error.message}</span>
                        )}
                      </>
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Confirm password:
                  </label>
                  <Controller
                    name={`cpassword`}
                    rules={{
                      required: 'Confirm password is required',
                      validate: (value) => value === watch('password') || 'Passwords do not match',
                    }}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <>
                        <Input.Password
                          value={value}
                          onChange={onChange}
                          placeholder='Confirm password'
                          status={error ? 'error' : ''}
                          iconRender={(visible) =>
                            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                          }
                        />
                        {error && (
                          <span style={{ color: 'red', fontSize: '12px' }}>{error.message}</span>
                        )}
                      </>
                    )}
                  />
                </Col>
              </Row>

              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    First name:
                  </label>
                  <Controller
                    name={`firstName`}
                    rules={{
                      required: 'First name is required',
                    }}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <>
                        <Input
                          value={value}
                          onChange={onChange}
                          placeholder='First name'
                          status={error ? 'error' : ''}
                        />
                        {error && (
                          <span style={{ color: 'red', fontSize: '12px' }}>{error.message}</span>
                        )}
                      </>
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Last name:
                  </label>
                  <Controller
                    name={`lastName`}
                    rules={{
                      required: 'Last name is required',
                    }}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <>
                        <Input
                          value={value}
                          onChange={onChange}
                          placeholder='Last name'
                          status={error ? 'error' : ''}
                        />
                        {error && (
                          <span style={{ color: 'red', fontSize: '12px' }}>{error.message}</span>
                        )}
                      </>
                    )}
                  />
                </Col>
              </Row>

              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col span={24} md={24}>
                  <label className={classes.label} htmlFor=''>
                    Photo URL:
                  </label>
                  <Controller
                    control={control}
                    name={`photoURL`}
                    render={({ field: { onChange, value } }) => (
                      <Input value={value} onChange={onChange} placeholder='Photo URL' />
                    )}
                  />
                </Col>
              </Row>

              {(authError || errorMsg) && (
                <Row align={'middle'}>
                  <Col span={24}>
                    {errorMsg && (
                      <p className={classNames(globalClasses.errorMsg, globalClasses.textLeft)}>
                        {authError}
                      </p>
                    )}

                    {!errorMsg && authError && (
                      <p className={classNames(globalClasses.errorMsg, globalClasses.textLeft)}>
                        {authError}
                      </p>
                    )}
                  </Col>
                </Row>
              )}

              <Row justify={'center'} gutter={[token.size, token.size]}>
                <Col span={24}>
                  <div className={classNames([classesLogin.btnSubmit])}>
                    <Button
                      className={globalClasses.fulWidth}
                      type='primary'
                      htmlType='submit'
                      loading={firebaseLoading}
                    >
                      {firebaseLoading ? 'Registering...' : 'register'}
                    </Button>
                  </div>
                </Col>
              </Row>

              {appConfig.appType !== EAppType.EXTENSION && (
                <Row justify={'center'}>
                  <Col span={24}>
                    <div className={classesLogin.register}>
                      <p>
                        Already have an account? <Link to={'/login'}>Log in</Link>
                      </p>
                    </div>
                  </Col>
                </Row>
              )}

              <Row justify={'center'} gutter={[token.size, token.size]}>
                <Col span={24}>
                  <div className={classesLogin.otherLoginMethod}>
                    <h3>Register with</h3>
                  </div>
                </Col>
              </Row>

              <Row gutter={[token.size, token.size]}>
                <Col span={24}>
                  <Button
                    className={globalClasses.fulWidth}
                    onClick={handleGoogleLogin}
                    loading={firebaseLoading}
                  >
                    Google
                  </Button>
                </Col>
              </Row>
            </Space>
          </form>
        )}

        {isRegistered && registerSuccess && (
          <Row justify={'center'}>
            <Col span={24}>
              <div className={classesLogin.register}>
                <p>
                  {registerMsg} <Link to={'/login'}>Log in</Link>
                </p>
              </div>
            </Col>
          </Row>
        )}

        {isRegistered && !registerSuccess && (
          <Row justify={'center'}>
            <Col span={24}>
              <div className={classesLogin.register}>
                <p>
                  {registerMsg}
                  <Link to={'/register'} onClick={() => setIsRegistered(false)}>
                    Retry
                  </Link>
                </p>
              </div>
            </Col>
          </Row>
        )}
      </div>
    </div>
  )
}

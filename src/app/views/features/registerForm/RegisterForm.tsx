import { Button, Col, Input, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import { appConfig, EAppType } from '@/config/appConfig'
import { IUser } from '@/models/user.model'
import { initRegisterForm } from '@/services/registerForm'
import { useFirebaseAuth } from '@/core/hooks'

import logo from '@/assets/img/logo.png'
import styles from './registerForm.module.scss'
import loginStyles from '../loginForm/loginForm.module.scss'

export const RegisterForm = ({ showBanner = true }) => {
  const { token } = theme.useToken()
  // Removed hook
  // Removed hook
  // Removed hook

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
    <div className={classNames([styles.registerForm])}>
      {showBanner && (
        <div className={loginStyles.loginFormHeader}>
          <img src={logo} alt='' />
          <h2 className={loginStyles.loginFormTitle}>Welcome to Enmory!</h2>
        </div>
      )}

      <div className={loginStyles.loginFormContent}>
        {!isRegistered && (
          <form onSubmit={handleSubmit(handleOk)}>
            <Space
              direction='vertical'
              size={[token.size, token.size]}
              className={appStyle.fulWidth}
            >
              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={24}>
                  <label className={styles.label} htmlFor=''>
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
                  <label className={styles.label} htmlFor=''>
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
                  <label className={styles.label} htmlFor=''>
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
                  <label className={styles.label} htmlFor=''>
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
                  <label className={styles.label} htmlFor=''>
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
                  <label className={styles.label} htmlFor=''>
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
                      <p className={classNames(appStyle.errorMsg, appStyle.textLeft)}>
                        {authError}
                      </p>
                    )}

                    {!errorMsg && authError && (
                      <p className={classNames(appStyle.errorMsg, appStyle.textLeft)}>
                        {authError}
                      </p>
                    )}
                  </Col>
                </Row>
              )}

              <Row justify={'center'} gutter={[token.size, token.size]}>
                <Col span={24}>
                  <div className={classNames([loginStyles.btnSubmit])}>
                    <Button
                      className={appStyle.fulWidth}
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
                    <div className={'text-center'}>
                      <p>
                        Already have an account? <Link to={'/login'}>Log in</Link>
                      </p>
                    </div>
                  </Col>
                </Row>
              )}

              <Row justify={'center'} gutter={[token.size, token.size]}>
                <Col span={24}>
                  <div className={loginStyles.otherLoginMethod}>
                    <h3>Register with</h3>
                  </div>
                </Col>
              </Row>

              <Row gutter={[token.size, token.size]}>
                <Col span={24}>
                  <Button
                    className={appStyle.fulWidth}
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
              <div className={'text-center'}>
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
              <div className={'text-center'}>
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

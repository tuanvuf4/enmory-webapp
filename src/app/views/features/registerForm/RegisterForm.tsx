import { Button, Col, Input, Row, Space, theme } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import appStyle from '@/style/appStyle.module.scss'
import { appConfig, EAppType } from '@/config/appConfig'
import { IUser } from '@/models/user.model'
import { initRegisterForm } from '@/services/registerForm'
import { useFirebaseAuth } from '@/core/hooks'

import logo from '@/assets/img/logo.png'

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
  } = useFirebaseAuth({
    // onRegisterSuccess: () => {
    //   navigate('/')
    // }
  })

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
    <div
      style={{
        width: 600,
        maxWidth: '100%',
        margin: `${token.size * 2}px auto`,
        background: token.colorBgBase,
        boxShadow: '0 0 35px',
      }}
    >
      {showBanner && (
        <div
          style={{
            textAlign: 'center',
            padding: token.size * 3,
            background: token.colorBgElevated,
            color: token.colorTextBase,
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
        {!isRegistered && (
          <form onSubmit={handleSubmit(handleOk)}>
            <Space
              direction='vertical'
              size={[token.size, token.size]}
              className={appStyle.fulWidth}
            >
              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={24}>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: token.size * 0.25,
                      color: token.colorTextSecondary,
                      fontStyle: 'italic',
                      fontSize: 13,
                    }}
                    htmlFor=''
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: token.size * 0.25,
                      color: token.colorTextSecondary,
                      fontStyle: 'italic',
                      fontSize: 13,
                    }}
                    htmlFor=''
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: token.size * 0.25,
                      color: token.colorTextSecondary,
                      fontStyle: 'italic',
                      fontSize: 13,
                    }}
                    htmlFor=''
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: token.size * 0.25,
                      color: token.colorTextSecondary,
                      fontStyle: 'italic',
                      fontSize: 13,
                    }}
                    htmlFor=''
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: token.size * 0.25,
                      color: token.colorTextSecondary,
                      fontStyle: 'italic',
                      fontSize: 13,
                    }}
                    htmlFor=''
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: token.size * 0.25,
                      color: token.colorTextSecondary,
                      fontStyle: 'italic',
                      fontSize: 13,
                    }}
                    htmlFor=''
                  >
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
                      <p style={{ color: token.colorError, textAlign: 'left' }}>{authError}</p>
                    )}

                    {!errorMsg && authError && (
                      <p style={{ color: token.colorError, textAlign: 'left' }}>{authError}</p>
                    )}
                  </Col>
                </Row>
              )}

              <Row justify={'center'} gutter={[token.size, token.size]}>
                <Col span={24}>
                  <div style={{ textAlign: 'center', margin: `${token.size}px 0` }}>
                    <Button
                      className={appStyle.fulWidth}
                      type='primary'
                      htmlType='submit'
                      loading={firebaseLoading}
                      style={{
                        borderRadius: 0,
                        letterSpacing: '1px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}
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
                      Register with
                    </h3>
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

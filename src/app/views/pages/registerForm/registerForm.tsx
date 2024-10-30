import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { Button, Col, Input, Radio, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import globalStyle from '@/style/appStyle'
import { appConfig } from '@/config/appConfig'
import { IUser } from '@/models/user.model'
import { apiAuth } from '@/services/api'
import { initRegisterForm } from '@/services/registerForm'

import logo from '@/assets/img/logo.png'
import styles from './style'
import loginStyle from '../login/style'


interface IRegisterForm {
  showBanner?: boolean
}

export const RegisterForm = ({ showBanner = true }) => {
  const { token } = theme.useToken()
  const classesLogin = loginStyle()
  const classes = styles()
  const gClasses = globalStyle()

  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false)
  const [registerMsg, setRegisterMsg] = useState<string>('')

  const { control, handleSubmit } = useForm<IUser>({
    defaultValues: initRegisterForm,
  })

  const handleOk = (data: IUser) => {
    apiAuth.register(data).then((response) => {
      setIsRegistered(true)
      setRegisterMsg(response.message)
      response.isSuccess ? setRegisterSuccess(true) : setRegisterSuccess(false)
    })
  }

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: (credentialResponse) => {
      console.log('credentialResponse: ', credentialResponse)
      if (credentialResponse) {
        // getGoogleUserInfo(credentialResponse.credential).then((resp) => {
        // console.log('resp: ', resp);
        // });
      }
    },
    onError: () => {
      console.log('Login Failed')
    },
  })

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
              className={gClasses.fulWidth}
            >
              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Username:
                  </label>
                  <Controller
                    control={control}
                    name={`username`}
                    render={({ field: { onChange, value } }) => (
                      <Input value={value} onChange={onChange} placeholder='Username' />
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Email:
                  </label>
                  <Controller
                    control={control}
                    name={`email`}
                    render={({ field: { onChange, value } }) => (
                      <Input value={value} onChange={onChange} placeholder='Email' />
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
                    control={control}
                    name={`password`}
                    render={({ field: { onChange, value } }) => (
                      <Input.Password
                        value={value}
                        onChange={onChange}
                        placeholder='Password'
                        iconRender={(visible) =>
                          visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                        }
                      />
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Confirm password:
                  </label>
                  <Controller
                    control={control}
                    name={`cpassword`}
                    render={({ field: { onChange, value } }) => (
                      <Input.Password
                        value={value}
                        onChange={onChange}
                        placeholder='Confirm password'
                        iconRender={(visible) =>
                          visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                        }
                      />
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
                    control={control}
                    name={`firstName`}
                    render={({ field: { onChange, value } }) => (
                      <Input value={value} onChange={onChange} placeholder='First name' />
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Last name:
                  </label>
                  <Controller
                    control={control}
                    name={`lastName`}
                    render={({ field: { onChange, value } }) => (
                      <Input value={value} onChange={onChange} placeholder='Last name' />
                    )}
                  />
                </Col>
              </Row>

              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col span={24} md={24}>
                  <label className={classes.label} htmlFor=''>
                    Avatar:
                  </label>
                  <Controller
                    control={control}
                    name={`avatar`}
                    render={({ field: { onChange, value } }) => (
                      <Input value={value} onChange={onChange} placeholder='Avatar' />
                    )}
                  />
                </Col>
              </Row>

              <Row align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Phone number:
                  </label>
                  <Controller
                    control={control}
                    name={`phoneNumber`}
                    render={({ field: { onChange, value } }) => (
                      <Input value={value} onChange={onChange} placeholder='Phone number' />
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <label className={classes.label} htmlFor=''>
                    Sex:
                  </label>
                  <Controller
                    control={control}
                    name={`sex`}
                    render={({ field: { onChange, value } }) => (
                      <Radio.Group onChange={(e) => onChange(e.target.value)} value={value}>
                        <Space direction='vertical'>
                          <Radio value={true}>Male</Radio>
                          <Radio value={false}>Female</Radio>
                          {/* <Radio value={2}>Others</Radio> */}
                        </Space>
                      </Radio.Group>
                    )}
                  />
                </Col>
              </Row>

              <Row justify={'center'} gutter={[token.size, token.size]}>
                <Col span={24}>
                  <div className={classNames([classesLogin.btnSubmit])}>
                    <Button className={gClasses.fulWidth} type='primary' htmlType='submit'>
                      register
                    </Button>
                  </div>
                </Col>
              </Row>

              {appConfig.appType !== 'EXT' && (
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

              {appConfig.env === 'development' && (
                <>
                  <Row justify={'center'} gutter={[token.size, token.size]}>
                    <Col span={24}>
                      <div className={classesLogin.otherLoginMethod}>
                        <h3>Register with</h3>
                      </div>
                    </Col>
                  </Row>

                  <Row gutter={[token.size, token.size]}>
                    <Col span={12}>
                      <Button className={gClasses.fulWidth}>Facebook</Button>
                    </Col>
                    <Col span={12}>
                      <Button className={gClasses.fulWidth} onClick={googleLogin}>
                        Google
                      </Button>
                    </Col>
                  </Row>
                </>
              )}
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

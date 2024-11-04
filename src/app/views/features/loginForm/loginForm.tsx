import { msgErrors } from '@/constant/index'
import globalStyle from '@/style/appStyle'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { appConfig } from '@/config/appConfig'
import { useAppDispatch } from '@/core/hooks'
import { IHttpResponse } from '@/models/http.model'
import { ILoginResponse, ILogin, IUser } from '@/models/user.model'
import { PayloadAction } from '@reduxjs/toolkit'
import { actionAsyncUser } from '@/store/async/user'
import { theme, Space, Row, Col, Input, Button } from 'antd'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
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

  const [errorMsg, setErrorMsg] = useState<string>('')

  const dispatch = useAppDispatch()

  const navigate = useNavigate()

  const { control, handleSubmit } = useForm<ILogin>({
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: ILogin) => {
    const result = await (dispatch(actionAsyncUser.login(data)) as Promise<
      PayloadAction<IHttpResponse<ILoginResponse>>
    >)
    if (result.payload && result.payload?.isSuccess) {
      setErrorMsg('')
      if (onLogin) onLogin(result.payload)
      const resultUser = await (dispatch(actionAsyncUser.getUserInfo()) as Promise<
        PayloadAction<IHttpResponse<IUser>>
      >)
      if (resultUser.payload && resultUser.payload.isSuccess) {
        navigate('/')
      }
    } else if (!result.payload) {
      setErrorMsg(msgErrors.login.fail)
    } else {
      setErrorMsg('')
    }
  }

  // const googleLogin = useGoogleLogin({
  //   flow: 'auth-code',
  //   onSuccess: (credentialResponse) => {
  //     console.log('credentialResponse: ', credentialResponse)
  //     if (credentialResponse) {
  //       // getGoogleUserInfo(credentialResponse.credential).then((resp) => {
  //       // console.log('resp: ', resp);
  //       // });
  //     }
  //   },
  //   onError: () => {
  //     console.log('Login Failed')
  //   },
  // })

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
                      placeholder='Username'
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

            {errorMsg && <p className={clsx(gClasses.errorMsg, gClasses.textLeft)}>{errorMsg}</p>}

            <Row justify={'center'}>
              <Col span={24}>
                <div className={clsx(classes.btnSubmit)}>
                  <Button className={gClasses.fulWidth} type='primary' htmlType='submit'>
                    login
                  </Button>
                </div>
              </Col>
            </Row>

            {appConfig.appType !== 'EXT' && (
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

            {appConfig.env === 'development' && (
              <>
                <Row justify={'center'}>
                  <Col span={24}>
                    <div className={classes.otherLoginMethod}>
                      <h3>Log in with</h3>
                    </div>
                  </Col>
                </Row>

                <Row gutter={[token.size, token.size]}>
                  <Col span={12}>
                    <Button className={gClasses.fulWidth}>Facebook</Button>
                  </Col>
                  <Col span={12}>
                    <Button className={gClasses.fulWidth}>Google</Button>
                  </Col>
                </Row>
              </>
            )}
          </Space>
        </form>
      </div>
    </div>
  )
}

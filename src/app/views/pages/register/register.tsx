import { useState } from 'react'
import { useGoogleLogin, useGoogleOneTapLogin } from '@react-oauth/google'
import { Button, Col, Input, Radio, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import { Controller, useForm } from 'react-hook-form'
import { initRegisterForm } from 'src/app/services/registerForm'
import { IUser } from 'src/app/models/user.model'
import gStyles from 'src/style/appStyle'
import styles from './style'
import logo from 'src/assets/img/logo.png'
import loginStyle from '../login/style'
import { Link } from 'react-router-dom'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { appConfig } from 'src/app/config/appConfig'
import { useAppDispatch } from 'src/app/core/hooks/redux'
import { actionAsyncUser } from 'src/app/store/async/user'
import { PayloadAction } from '@reduxjs/toolkit'
import { IHttpResponse } from 'src/app/models/http.model'
import { apiAuth } from 'src/app/services/api/auth.api'
import { RegisterForm } from '../registerForm/registerForm'

const Register = () => {
  const { token } = theme.useToken()
  const gClasses = gStyles(token)

  return (
    <div className={gClasses.container}>
      <div className={classNames(gClasses.bodyContent)}>
        <RegisterForm />
      </div>
    </div>
  )
}

export default Register

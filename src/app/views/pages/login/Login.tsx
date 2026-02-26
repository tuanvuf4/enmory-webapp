import appStyle from '@/style/appStyle.module.scss'
import { LoginForm } from '@/views/features/loginForm/LoginForm'
import classNames from 'clsx'

const Login = () => {
  return (
    <div className={appStyle.container}>
      <div className={classNames(appStyle.bodyContent)}>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login

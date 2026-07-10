import appStyle from '@/style/appStyle.module.scss'
import { LoginForm } from '@/views/features/loginForm/LoginForm'

const Login = () => {
  return (
    <div className={appStyle.container}>
      <div className={appStyle.bodyContent}>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login

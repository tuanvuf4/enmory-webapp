import globalStyles from '@/style/appStyle.module.scss'
import { LoginForm } from '@/views/features/loginForm/LoginForm'
import classNames from 'clsx'

const Login = () => {
  return (
    <div className={globalStyles.container}>
      <div className={classNames(globalStyles.bodyContent)}>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login

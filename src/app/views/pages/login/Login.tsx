import globalStyle from '@/style/appStyle'
import { LoginForm } from '@/views/features/loginForm/LoginForm'
import classNames from 'clsx'

const Login = () => {
  const gClasses = globalStyle()

  return (
    <div className={gClasses.container}>
      <div className={classNames(gClasses.bodyContent)}>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login

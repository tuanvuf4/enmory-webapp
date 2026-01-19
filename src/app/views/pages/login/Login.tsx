import globalStyle from '@/style/appStyle'
import { LoginForm } from '@/views/features/loginForm/LoginForm'
import classNames from 'clsx'

const Login = () => {
  const globalClasses = globalStyle()

  return (
    <div className={globalClasses.container}>
      <div className={classNames(globalClasses.bodyContent)}>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login

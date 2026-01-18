import globalStyle from '@/style/appStyle'
import { LoginForm } from '@/views/features/loginForm/loginForm'
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

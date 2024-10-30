import { theme } from 'antd'
import classNames from 'clsx'
import gStyles from 'src/style/appStyle'
import styles from './style'
import { LoginForm } from '../../features/loginForm/loginForm'

const Login = () => {
  const { token } = theme.useToken()
  const classes = styles(token)
  const gClasses = gStyles(token)

  return (
    <div className={gClasses.container}>
      <div className={classNames(gClasses.bodyContent)}>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login

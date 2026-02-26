import classNames from 'clsx'
import appStyle from '@/style/appStyle.module.scss'
import { RegisterForm } from '@/views/features/registerForm/RegisterForm'

const Register = () => {
  return (
    <div className={appStyle.container}>
      <div className={classNames(appStyle.bodyContent)}>
        <RegisterForm />
      </div>
    </div>
  )
}

export default Register

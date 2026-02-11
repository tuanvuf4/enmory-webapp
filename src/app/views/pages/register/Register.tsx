import classNames from 'clsx'
import globalStyles from '@/style/appStyle.module.scss'
import { RegisterForm } from '@/views/features/registerForm/RegisterForm'

const Register = () => {
  return (
    <div className={globalStyles.container}>
      <div className={classNames(globalStyles.bodyContent)}>
        <RegisterForm />
      </div>
    </div>
  )
}

export default Register

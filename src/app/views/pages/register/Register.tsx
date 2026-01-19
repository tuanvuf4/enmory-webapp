import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import { RegisterForm } from '../registerForm/RegisterForm'

const Register = () => {
  const globalClasses = globalStyle()

  return (
    <div className={globalClasses.container}>
      <div className={classNames(globalClasses.bodyContent)}>
        <RegisterForm />
      </div>
    </div>
  )
}

export default Register

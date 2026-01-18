import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import { RegisterForm } from '../registerForm/RegisterForm'

const Register = () => {
  const gClasses = globalStyle()

  return (
    <div className={gClasses.container}>
      <div className={classNames(gClasses.bodyContent)}>
        <RegisterForm />
      </div>
    </div>
  )
}

export default Register

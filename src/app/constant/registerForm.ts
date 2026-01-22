import { IUser } from '../models/user.model'

export const initRegisterForm: Partial<IUser> = {
  email: '',
  password: '',
  cpassword: '',
  firstName: '',
  lastName: '',
  photoURL: '',
}

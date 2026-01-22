import { IUser } from '../models/user.model'

export const initRegisterForm: Partial<IUser> = {
  displayName: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  photoURL: '',
}

import { IUser } from '../../models/user.model'

export const initRegisterForm: Partial<IUser> = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  avatar: '',
  phoneNumber: '',
  sex: true,
}

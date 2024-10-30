import { patternValidation } from './patterns.util'

export const isEmail = (email: string) => patternValidation.emailPattern.test(email.toLowerCase())

export const isPhoneNumber = (phone: string) => patternValidation.phoneNumberPattern.test(phone)

export const isEmptyPlainObject = (emptyObject: object) => {
  return Object.keys(emptyObject).length === 0 && emptyObject.constructor === Object ? true : false
}

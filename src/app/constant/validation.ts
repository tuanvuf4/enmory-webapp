export const msgErrors = {
  firstName: {
    require: 'First name is required',
  },
  lastName: {
    require: 'Last name is required',
  },
  phoneNumber: {
    require: 'Phone number is required',
    invalid: 'Phone number format incorrect',
  },
  email: {
    require: 'Email is required',
    invalid: 'Email format incorrect',
  },
  required: 'This field must be required!',
  existed: 'This item was existed!',
  login: {
    fail: 'Incorrect username or password!',
  },
  minLength: (field: string, length: number) => {
    return `${field} is too short, minimum at ${length}`
  },
  maxLength: (field: string, length: number) => {
    return `${field} is too long, maximum at ${length}`
  },
  maxSize: (field: string, size: number) => {
    return `${field} is too long, maximum at ${size}MB`
  },
  isNotUrl: (field: string) => {
    return `${field} is not in URL format`
  },
}

export const msgWarning = {
  missingMeaning: 'Missing translation or definition could not be found in the study set.',
  empty: 'This item is empty!',
}

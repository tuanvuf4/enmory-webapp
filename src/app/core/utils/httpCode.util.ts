interface IHttpCode {
  code: number
  message: string
}

// 2xx
const OK: IHttpCode = { code: 200, message: 'Ok' }
const CREATED: IHttpCode = { code: 201, message: 'Created' }
// 4xx
const FORBIDDEN: IHttpCode = { code: 403, message: 'Forbidden' }
const UNAUTHORIZED: IHttpCode = { code: 401, message: 'Unauthorized' }
const BAD_REQUEST: IHttpCode = { code: 400, message: 'Bad Request' }
const NOT_FOUND: IHttpCode = { code: 404, message: 'Not Found' }
const METHOD_NOT_ALLOWED: IHttpCode = {
  code: 405,
  message: 'Method Not Allowed',
}
// 5xx
const SERVER_ERROR: IHttpCode = { code: 500, message: 'Internal Server Error' }
const BAD_GATEWAY: IHttpCode = { code: 200, message: 'Bad Gateway' }

export const HttpUtils = {
  isOk: (code: number | string): boolean => {
    return Number(code) === OK.code
  },
  code: {
    OK,
    CREATED,
    FORBIDDEN,
    UNAUTHORIZED,
    BAD_REQUEST,
    NOT_FOUND,
    METHOD_NOT_ALLOWED,
    SERVER_ERROR,
    BAD_GATEWAY,
  },
}

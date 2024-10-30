/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string

  readonly API_BASE_URL: string

  readonly APP_TYPE: string

  readonly LOCAL_KEY_TRANSFORM: string

  readonly GOOGLE_CLIENT_ID: string

  readonly LOCAL_GOOGLE_AUTH_CLIENT_SECRET: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

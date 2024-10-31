/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TYPE: string

  readonly VITE_API_BASE_URL: string

  readonly VITE_LOCAL_KEY_TRANSFORM: string

  readonly VITE_GOOGLE_CLIENT_ID: string

  readonly VITE_GOOGLE_AUTH_CLIENT_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

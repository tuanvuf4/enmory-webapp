import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const publicExtDir = path.join(rootDir, 'public_ext')
const srcExtDir = path.join(rootDir, 'src', 'extension')

mkdirSync(publicExtDir, { recursive: true })

const key = String(process.env.VITE_GEMINI_API_KEY || '').trim()
const firebaseApiKey = String(process.env.VITE_FIREBASE_API_KEY || '').trim()
const firebaseProjectId = String(process.env.VITE_FIREBASE_PROJECT_ID || 'enmory-21593').trim()
const defaultUid = String(process.env.ENMORY_UID || '').trim()

const configContent = `self.__ENMORY_EXTENSION_CONFIG__ = ${JSON.stringify({
  geminiApiKey: key,
  firebase: {
    apiKey: firebaseApiKey,
    projectId: firebaseProjectId,
  },
  defaultUid: defaultUid,
})};\n`

writeFileSync(path.join(publicExtDir, 'extension-config.js'), configContent)


for (const file of ['background.js', 'content.js', 'manifest.json']) {
  const src = path.join(srcExtDir, file)
  const dest = path.join(publicExtDir, file)

  if (existsSync(src)) {
    copyFileSync(src, dest)
    console.log(`synced ${file}`)
  }
}

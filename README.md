# Enmory Web App

A comprehensive vocabulary learning application built with React, TypeScript, and Vite.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- OpenAI API key (for review features)

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd enmory-webapp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in your actual values:

   - `VITE_OPENAI_API_KEY`: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - `VITE_FIREBASE_*`: Your Firebase project credentials
   - `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
   - Other configuration values as needed

4. **Run development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:9999`

## Build

### Web Application

```bash
npm run build:web
```

Builds the web version using `.env.web` configuration.

### Chrome Extension

```bash
npm run build:ext
```

Builds the extension version using `.env.ext` configuration.

## Environment Files

- `.env` - Local development (default)
- `.env.web` - Web production build
- `.env.ext` - Chrome extension build

**Important:** Never commit actual `.env` files to git. They contain sensitive API keys.

## OpenAI API Key Configuration

The app uses OpenAI for grammar and spelling review features:

1. **Local Development**: API key is loaded from `.env` file via `VITE_OPENAI_API_KEY`
2. **Web Build**: API key is injected at build time from `.env.web`
3. **Extension Build**: API key is injected into `extension-config.js` during build from `.env.ext`

All API keys are accessed through `import.meta.env.VITE_OPENAI_API_KEY` in the code.

## Project Structure

```
src/
  ├── app/              # Main application code
  │   ├── views/        # React components
  │   ├── services/     # API services (OpenAI, Firebase, etc.)
  │   ├── store/        # Redux store
  │   └── ...
  ├── extension/        # Chrome extension specific code
  └── ...
```

## Features

- Vocabulary management with meanings and examples
- Grammar and spelling review (powered by OpenAI)
- Article reading with IOTD (Item of the Day)
- User authentication via Google/Firebase
- Chrome extension for external website integration

## Review Functionality

The app includes two separate review systems:

1. **Web App Review**: Uses `ReviewableTextArea` component with OpenAI integration
2. **Extension Review**: Injects review UI into external website textareas

See [docs/REVIEW_ARCHITECTURE.md](docs/REVIEW_ARCHITECTURE.md) for detailed architecture.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === '/') {
    return '/'
  }

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? normalizeBasePath(process.env.VITE_APP_BASE_PATH ?? '/kopic/') : '/',
}))

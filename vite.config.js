import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { sentryVitePlugin } from '@sentry/vite-plugin'

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const buildInfo = {
  version: getAppVersion(),
  commit: getGitCommit(),
  timestamp: new Date().toISOString(),
}

const sentryRelease = process.env.VITE_SENTRY_RELEASE || `booth-bridge@${buildInfo.version}+${buildInfo.commit}`
const sentryUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
)

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __BB_BUILD_INFO__: JSON.stringify(buildInfo),
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease),
  },
  build: {
    sourcemap: true,
  },
  plugins: [
    react(),
    ...(sentryUploadEnabled
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: sentryRelease },
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
  ],
})

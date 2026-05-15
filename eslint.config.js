/**
 * ESLint config
 *
 * 책임:
 * - 새 src 코드의 정적 품질 기준 적용
 * - legacy reference code를 검사 대상에서 제외해 migration 경계를 보존
 *
 * 하지 않는 것:
 * - src_legacy 품질 보정
 * - feature별 예외 규칙 남발
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src_legacy']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])

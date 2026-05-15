/**
 * main
 *
 * 책임:
 * - Vite/React runtime entrypoint
 * - React root를 단 한 번 생성하고 App에 위임
 *
 * 하지 않는 것:
 * - provider 조립
 * - route 결정
 * - feature 초기화
 *
 * 의존:
 * - React DOM runtime
 * - app root component
 *
 * 사용 위치:
 * - index.html script entry
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


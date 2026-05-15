/**
 * App
 *
 * 책임:
 * - 앱 최상위 component를 노출
 * - bootstrap 세부 구현을 app layer로 위임
 *
 * 하지 않는 것:
 * - route별 UI 직접 조립
 * - 전역 상태 직접 변경
 * - feature 로직 포함
 *
 * 의존:
 * - AppShell
 *
 * 사용 위치:
 * - main.tsx
 */
import { AppShell } from '@/app/AppShell'

export function App() {
  return <AppShell />
}


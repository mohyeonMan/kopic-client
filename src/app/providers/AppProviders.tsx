/**
 * AppProviders
 *
 * 책임:
 * - 앱 전역 provider를 한 위치에서 조립
 * - provider 추가/제거 시 영향 범위를 app layer 안으로 제한
 *
 * 하지 않는 것:
 * - feature별 provider 남발
 * - route 결정
 * - server state를 직접 읽거나 변경
 *
 * 의존:
 * - TanStack Query client
 *
 * 사용 위치:
 * - AppShell
 */
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '@/app/providers/queryClient'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}


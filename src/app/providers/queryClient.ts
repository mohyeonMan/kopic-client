/**
 * queryClient
 *
 * 책임:
 * - TanStack Query의 서버 상태 캐시 정책 baseline 정의
 * - HTTP resource migration 시 동일한 retry/stale 정책을 재사용
 *
 * 하지 않는 것:
 * - WebSocket realtime game state 저장
 * - UI 상태 저장
 * - feature별 query key 정의
 *
 * 의존:
 * - TanStack Query
 *
 * 사용 위치:
 * - AppProviders
 */
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})


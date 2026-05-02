import { AppRouter } from '@/app/router/AppRouter'
import { AppStateProvider } from '@/app/store/AppStateContext'

export function AppShell() {
  return (
    <AppStateProvider>
      <AppRouter />
    </AppStateProvider>
  )
}

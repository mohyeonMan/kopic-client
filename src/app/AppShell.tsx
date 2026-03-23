import { AppStateProvider } from './store/AppStateContext'
import { AppRouter } from './router/AppRouter'

export function AppShell() {
  return (
    <AppStateProvider>
      <AppRouter />
    </AppStateProvider>
  )
}

import { EntryPage } from '@/pages/entry/EntryPage'
import { GamePage } from '@/pages/game/GamePage'
import { AppLayout } from '@/app/ui/AppLayout'
import { routes } from './routes'
import { useAppRouter } from './useAppRouter'

export function AppRouter() {
  const { route, navigate } = useAppRouter()

  return (
    <AppLayout currentRoute={route} onNavigate={navigate}>
      {route === routes.main && <EntryPage onNavigate={navigate} />}
      {route === routes.game && <GamePage />}
    </AppLayout>
  )
}

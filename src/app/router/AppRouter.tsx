import { routes } from './routes'
import { useAppRouter } from './useAppRouter'
import { AppLayout } from '../ui/AppLayout'
import { EntryPage } from '../../pages/entry/EntryPage'
import { GamePage } from '../../pages/game/GamePage'

export function AppRouter() {
  const { route, navigate } = useAppRouter()

  return (
    <AppLayout currentRoute={route} onNavigate={navigate}>
      {route === routes.main && <EntryPage onNavigate={navigate} />}
      {route === routes.game && <GamePage />}
    </AppLayout>
  )
}

import { routes } from './routes'
import { useAppRouter } from './useAppRouter'
import { AppLayout } from '../ui/AppLayout'
import { EntryPage } from '../../pages/entry/EntryPage'
import { LobbyPage } from '../../pages/lobby/LobbyPage'
import { GamePage } from '../../pages/game/GamePage'
import { ResultPage } from '../../pages/result/ResultPage'

export function AppRouter() {
  const { route, navigate } = useAppRouter()

  return (
    <AppLayout currentRoute={route} onNavigate={navigate}>
      {route === routes.entry && <EntryPage onNavigate={navigate} />}
      {route === routes.lobby && <LobbyPage onNavigate={navigate} />}
      {route === routes.game && <GamePage onNavigate={navigate} />}
      {route === routes.result && <ResultPage onNavigate={navigate} />}
    </AppLayout>
  )
}

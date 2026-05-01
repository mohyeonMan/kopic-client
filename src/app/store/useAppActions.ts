import { useContext } from 'react'
import { AppActionsContext } from './appStateContextValue'

export function useAppActions() {
  const context = useContext(AppActionsContext)

  if (!context) {
    throw new Error('useAppActions must be used within AppStateProvider')
  }

  return context
}

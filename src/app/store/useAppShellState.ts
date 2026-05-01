import { useContext } from 'react'
import { AppShellStateContext } from './appStateContextValue'

export function useAppShellState() {
  const context = useContext(AppShellStateContext)

  if (!context) {
    throw new Error('useAppShellState must be used within AppStateProvider')
  }

  return context
}

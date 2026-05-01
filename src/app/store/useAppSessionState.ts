import { useContext } from 'react'
import { AppSessionStateContext } from './appStateContextValue'

export function useAppSessionState() {
  const context = useContext(AppSessionStateContext)

  if (!context) {
    throw new Error('useAppSessionState must be used within AppStateProvider')
  }

  return context
}

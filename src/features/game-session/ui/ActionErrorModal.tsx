import type { AppState } from '@/entities/game/model'

type ActionErrorModalProps = {
  actionError: AppState['session']['actionError']
  onDismiss: () => void
}

export function ActionErrorModal({ actionError, onDismiss }: ActionErrorModalProps) {
  if (!actionError) {
    return null
  }

  return (
    <div
      className="game-action-error-modal-backdrop"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        className="game-action-error-modal"
        role="dialog"
        aria-modal="true"
        aria-label="요청 실패"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>요청 실패</h3>
        <p className="game-action-error-message">{actionError.message}</p>
        <p className="game-action-error-reason">{`사유: ${actionError.reason}`}</p>
        <div className="game-action-error-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onDismiss}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

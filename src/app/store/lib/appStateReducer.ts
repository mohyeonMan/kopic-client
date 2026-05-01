import type {
  AppState,
  CanvasStroke,
  ChatMessage,
  ConnectionStatus,
  GameSettings,
  RoomSnapshot,
  TurnPhase,
} from '../../../entities/game/model'
import type {
  GeDrawingStartedPayload,
  GeGameResultPayload,
  GeGameStartedPayload,
  GeGuessCorrectPayload,
  GeReturnToLobbyPayload,
  GeRoundStartedPayload,
  GeTurnEndedPayload,
  GeTurnStartedPayload,
  GeWordChoiceOpenedPayload,
  ServerGameStartedPayload,
  ServerWordChoicePayload,
} from '../appStateContextValue'
import type {
  ServerRoomJoinedPayload,
  ServerRoomLeftPayload,
} from './appStatePayloadDecoders'
import {
  reduceCanvasCleared,
  reduceCanvasStrokeReceived,
  reduceCanvasStrokesReceived,
} from './appStateCanvas'
import {
  reduceChatReceived,
  reduceGuessSubmitted,
} from './appStateChat'
import {
  reduceGameEndedApplied,
  reduceGameStartedApplied,
  reduceGeDrawingStartedApplied,
  reduceGeGameResultApplied,
  reduceGeGameStartedApplied,
  reduceGeGuessCorrectApplied,
  reduceGeReturnToLobbyApplied,
  reduceGeRoundStartedApplied,
  reduceGeTurnEndedApplied,
  reduceGeTurnStartedApplied,
  reduceGeWordChoiceOpenedApplied,
  reduceLobbySettingsPatched,
  reduceMockFlowAdvanced,
  reduceTurnPhaseForced,
  reduceWordChoiceApplied,
} from './appStateGame'
import {
  reduceRoomJoinedApplied,
  reduceRoomLeftApplied,
  reduceRoomSnapshotApplied,
} from './appStateRoom'
import {
  reduceConnectionErrorDismissed,
  reduceConnectionErrorReported,
  reduceConnectionStatusChanged,
  reduceJoinAccepted,
  reduceJoinErrorDismissed,
  reduceJoinFailed,
  reduceJoinRequested,
  reduceRoomCacheCleared,
  reduceSessionIdSynced,
  reduceSessionNicknameUpdated,
} from './appStateSession'

export type AppAction =
  | { type: 'local/sessionNicknameUpdated'; payload: string }
  | { type: 'local/sessionIdSynced'; payload: string }
  | { type: 'local/joinRequested'; payload?: { roomCode?: string; action?: 0 | 1 } }
  | { type: 'local/joinAccepted' }
  | { type: 'local/joinFailed'; payload: { reason: string; message: string } }
  | { type: 'local/joinErrorDismissed' }
  | { type: 'local/connectionErrorReported'; payload: { reason: string; message: string } }
  | { type: 'local/connectionErrorDismissed' }
  | { type: 'local/roomCacheCleared' }
  | { type: 'local/lobbySettingsPatched'; payload: Partial<GameSettings> }
  | { type: 'local/guessSubmitted'; payload: string }
  | { type: 'connection/statusChanged'; payload: ConnectionStatus }
  | { type: 'server/roomSnapshotApplied'; payload: RoomSnapshot }
  | { type: 'server/roomJoinedApplied'; payload: ServerRoomJoinedPayload }
  | { type: 'server/roomLeftApplied'; payload: ServerRoomLeftPayload }
  | { type: 'server/geGameStartedApplied'; payload: GeGameStartedPayload }
  | { type: 'server/geRoundStartedApplied'; payload: GeRoundStartedPayload }
  | { type: 'server/geTurnStartedApplied'; payload: GeTurnStartedPayload }
  | { type: 'server/geGuessCorrectApplied'; payload: GeGuessCorrectPayload }
  | { type: 'server/geWordChoiceOpenedApplied'; payload: GeWordChoiceOpenedPayload }
  | { type: 'server/geDrawingStartedApplied'; payload: GeDrawingStartedPayload }
  | { type: 'server/geTurnEndedApplied'; payload: GeTurnEndedPayload }
  | { type: 'server/geGameResultApplied'; payload: GeGameResultPayload }
  | { type: 'server/geReturnToLobbyApplied'; payload: GeReturnToLobbyPayload }
  | { type: 'server/gameStartedApplied'; payload: ServerGameStartedPayload }
  | { type: 'server/wordChoiceApplied'; payload: ServerWordChoicePayload }
  | { type: 'server/chatReceived'; payload: ChatMessage }
  | { type: 'server/canvasStrokeReceived'; payload: CanvasStroke }
  | { type: 'server/canvasStrokesReceived'; payload: CanvasStroke[] }
  | { type: 'server/canvasCleared' }
  | { type: 'server/gameEndedApplied' }
  | { type: 'dev/turnPhaseForced'; payload: TurnPhase }
  | { type: 'dev/mockFlowAdvanced' }

export function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'local/sessionNicknameUpdated':
      return reduceSessionNicknameUpdated(state, action.payload)
    case 'local/sessionIdSynced':
      return reduceSessionIdSynced(state, action.payload)
    case 'local/joinRequested':
      return reduceJoinRequested(state, action.payload)
    case 'local/joinAccepted':
      return reduceJoinAccepted(state)
    case 'local/joinFailed':
      return reduceJoinFailed(state, action.payload)
    case 'local/joinErrorDismissed':
      return reduceJoinErrorDismissed(state)
    case 'local/connectionErrorReported':
      return reduceConnectionErrorReported(state, action.payload)
    case 'local/connectionErrorDismissed':
      return reduceConnectionErrorDismissed(state)
    case 'local/roomCacheCleared':
      return reduceRoomCacheCleared(state)
    case 'local/lobbySettingsPatched':
      return reduceLobbySettingsPatched(state, action.payload)
    case 'local/guessSubmitted':
      return reduceGuessSubmitted(state, action.payload)
    case 'connection/statusChanged':
      return reduceConnectionStatusChanged(state, action.payload)
    case 'server/roomSnapshotApplied':
      return reduceRoomSnapshotApplied(state, action.payload)
    case 'server/roomJoinedApplied':
      return reduceRoomJoinedApplied(state, action.payload)
    case 'server/roomLeftApplied':
      return reduceRoomLeftApplied(state, action.payload)
    case 'server/gameStartedApplied':
      return reduceGameStartedApplied(state, action.payload)
    case 'server/geGameStartedApplied':
      return reduceGeGameStartedApplied(state, action.payload)
    case 'server/geRoundStartedApplied':
      return reduceGeRoundStartedApplied(state, action.payload)
    case 'server/geTurnStartedApplied':
      return reduceGeTurnStartedApplied(state, action.payload)
    case 'server/geGuessCorrectApplied':
      return reduceGeGuessCorrectApplied(state, action.payload)
    case 'server/geWordChoiceOpenedApplied':
      return reduceGeWordChoiceOpenedApplied(state, action.payload)
    case 'server/geDrawingStartedApplied':
      return reduceGeDrawingStartedApplied(state, action.payload)
    case 'server/geTurnEndedApplied':
      return reduceGeTurnEndedApplied(state, action.payload)
    case 'server/geGameResultApplied':
      return reduceGeGameResultApplied(state, action.payload)
    case 'server/geReturnToLobbyApplied':
      return reduceGeReturnToLobbyApplied(state, action.payload)
    case 'server/wordChoiceApplied':
      return reduceWordChoiceApplied(state, action.payload)
    case 'server/chatReceived':
      return reduceChatReceived(state, action.payload)
    case 'server/canvasStrokeReceived':
      return reduceCanvasStrokeReceived(state, action.payload)
    case 'server/canvasStrokesReceived':
      return reduceCanvasStrokesReceived(state, action.payload)
    case 'server/canvasCleared':
      return reduceCanvasCleared(state)
    case 'server/gameEndedApplied':
      return reduceGameEndedApplied(state)
    case 'dev/turnPhaseForced':
      return reduceTurnPhaseForced(state, action.payload)
    case 'dev/mockFlowAdvanced':
      return reduceMockFlowAdvanced(state)
    default:
      return state
  }
}

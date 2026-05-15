/**
 * GamePage
 *
 * 책임:
 * - joined session의 game route 조립
 * - room-lobby, game-board, game-chat feature에 session/game entity state 전달
 *
 * 하지 않는 것:
 * - legacy game page 복제
 * - canvas/chat/participant 기능 구현
 * - WebSocket protocol 처리
 *
 * 의존:
 * - game entity store
 * - session entity store
 * - room-lobby feature
 *
 * 사용 위치:
 * - AppRouter
 */
import { useGameStore } from '@/entities/game/model/gameStore'
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { GameBoardPanel } from '@/features/game-board/ui/GameBoardPanel'
import { GameChatPanel } from '@/features/game-chat/ui/GameChatPanel'
import { GameStatusStrip } from '@/features/game-progress/ui/GameStatusStrip'
import { ParticipantScorePanel } from '@/features/participants/ui/ParticipantScorePanel'
import { RoomLobbyView } from '@/features/room-lobby/ui/RoomLobbyView'
import './GamePage.css'

export function GamePage() {
  const nickname = useSessionStore((state) => state.nickname)
  const sessionId = useSessionStore((state) => state.sessionId)
  const room = useGameStore((state) => state.room)

  return (
    <div className="game-page">
      <GameStatusStrip room={room} />
      <div className="game-page__main">
        <GameBoardPanel mySessionId={sessionId} room={room} />
        <GameChatPanel />
      </div>
      <div className="game-page__side">
        <ParticipantScorePanel mySessionId={sessionId} room={room} />
        <RoomLobbyView mySessionId={sessionId} nickname={nickname} room={room} />
      </div>
    </div>
  )
}

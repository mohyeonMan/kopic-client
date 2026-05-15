/**
 * RoomLobbyView
 *
 * 책임:
 * - joined room의 lobby projection 표시
 * - room metadata/session/settings 표시
 * - host lobby controls 노출
 *
 * 하지 않는 것:
 * - WebSocket/API 호출
 * - room state mutation 규칙 소유
 *
 * 의존:
 * - game entity room snapshot
 * - session entity identity
 *
 * 사용 위치:
 * - GamePage
 */
import type { RoomSnapshot } from '@/entities/game/model/gameTypes'
import { useRoomLobbyControls } from '@/features/room-lobby/model/useRoomLobbyControls'
import './RoomLobbyView.css'

type RoomLobbyViewProps = {
  mySessionId: string | null
  nickname: string
  room: RoomSnapshot
}

export function RoomLobbyView({ mySessionId, nickname, room }: RoomLobbyViewProps) {
  const host = room.participants.find((participant) => participant.sessionId === room.hostSessionId)
  const me = room.participants.find((participant) => participant.sessionId === mySessionId)
  const participants = room.participants.length > 0 ? room.participants : []
  const isHost = room.hostSessionId === mySessionId
  const controls = useRoomLobbyControls()

  return (
    <section className="room-lobby">
      <header className="room-lobby__header">
        <div>
          <p className="room-lobby__eyebrow">ROOM {room.roomState}</p>
          <h1>{room.roomCode || '방 정보를 기다리는 중'}</h1>
        </div>
        <div className="room-lobby__summary" aria-label="방 요약">
          <span>{room.roomType === 'PRIVATE' ? '비공개 방' : '랜덤 매칭'}</span>
          <span>{participants.length}명 참여</span>
          <span>방장 {host?.nickname ?? '-'}</span>
        </div>
      </header>

      <div className="room-lobby__grid">
        <article className="room-lobby__panel">
          <h2>내 세션</h2>
          <dl className="room-lobby__details">
            <div>
              <dt>닉네임</dt>
              <dd>{me?.nickname ?? nickname ?? '-'}</dd>
            </div>
            <div>
              <dt>세션 ID</dt>
              <dd>{mySessionId ?? '-'}</dd>
            </div>
            <div>
              <dt>역할</dt>
              <dd>{me?.isHost ? '방장' : '참여자'}</dd>
            </div>
          </dl>
        </article>

        <article className="room-lobby__panel room-lobby__panel--wide">
          <div className="room-lobby__panel-header">
            <h2>게임 설정</h2>
            {isHost ? (
              <button type="button" className="room-lobby__start-button" onClick={controls.startGame}>
                게임 시작
              </button>
            ) : null}
          </div>
          <dl className="room-lobby__settings">
            <div>
              <dt>라운드</dt>
              <dd>
                {isHost ? (
                  <SettingSelect
                    value={room.settings.roundCount}
                    options={[3, 4, 5, 6, 7, 8, 9, 10]}
                    onChange={(value) => controls.applyNumericSetting('roundCount', value)}
                  />
                ) : (
                  room.settings.roundCount
                )}
              </dd>
            </div>
            <div>
              <dt>그리기 시간</dt>
              <dd>
                {isHost ? (
                  <SettingSelect
                    value={room.settings.drawSec}
                    options={[20, 30, 40, 50, 60]}
                    suffix="s"
                    onChange={(value) => controls.applyNumericSetting('drawSec', value)}
                  />
                ) : (
                  `${room.settings.drawSec}s`
                )}
              </dd>
            </div>
            <div>
              <dt>단어 선택</dt>
              <dd>
                {isHost ? (
                  <SettingSelect
                    value={room.settings.wordChoiceSec}
                    options={[5, 7, 10, 12, 15]}
                    suffix="s"
                    onChange={(value) => controls.applyNumericSetting('wordChoiceSec', value)}
                  />
                ) : (
                  `${room.settings.wordChoiceSec}s`
                )}
              </dd>
            </div>
            <div>
              <dt>힌트 간격</dt>
              <dd>
                {isHost ? (
                  <SettingSelect
                    value={room.settings.hintRevealSec}
                    options={[30, 25, 20, 15, 10]}
                    suffix="s"
                    onChange={(value) => controls.applyNumericSetting('hintRevealSec', value)}
                  />
                ) : (
                  `${room.settings.hintRevealSec}s`
                )}
              </dd>
            </div>
            <div>
              <dt>종료 방식</dt>
              <dd>{room.settings.endMode === 'FIRST_CORRECT' ? '첫 정답' : '시간 또는 전원 정답'}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  )
}

type SettingSelectProps = {
  onChange: (value: number) => void
  options: number[]
  suffix?: string
  value: number
}

function SettingSelect({ onChange, options, suffix = '', value }: SettingSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
          {suffix}
        </option>
      ))}
    </select>
  )
}

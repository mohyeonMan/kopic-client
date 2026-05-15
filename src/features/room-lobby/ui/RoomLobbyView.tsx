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
import type { GameSettings } from '@/entities/game/model/gameTypes'
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
  const customOnlyWithoutWords =
    room.roomType === 'PRIVATE' &&
    room.settings.customWordMode === 'CUSTOM_ONLY' &&
    room.settings.customWordsRaw.trim().length === 0
  const canStartGame = isHost && participants.length >= 2 && !customOnlyWithoutWords
  const startValidationText =
    participants.length < 2
      ? '게임 시작은 최소 2명부터 가능합니다.'
      : customOnlyWithoutWords
        ? '커스텀만 모드에서는 단어를 1개 이상 입력해야 합니다.'
        : null

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
              <button
                type="button"
                className="room-lobby__start-button"
                disabled={!canStartGame}
                onClick={() => {
                  if (canStartGame) {
                    controls.startGame()
                  }
                }}
              >
                게임 시작
              </button>
            ) : null}
          </div>
          {startValidationText ? (
            <p className="room-lobby__validation">{startValidationText}</p>
          ) : null}
          <dl className="room-lobby__settings">
            <div>
              <dt>라운드</dt>
              <dd>
                {isHost ? (
                  <SettingSelect
                    value={room.settings.roundCount}
                    options={[3, 4, 5, 6, 7, 8, 9, 10]}
                    disabled={!isHost}
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
                    disabled={!isHost}
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
                    disabled={!isHost}
                    onChange={(value) => controls.applyNumericSetting('wordChoiceSec', value)}
                  />
                ) : (
                  `${room.settings.wordChoiceSec}s`
                )}
              </dd>
            </div>
            <div>
              <dt>선택 단어 수</dt>
              <dd>
                {isHost ? (
                  <SettingSelect
                    value={room.settings.wordChoiceCount}
                    options={[3, 4, 5]}
                    disabled={!isHost}
                    onChange={(value) => controls.applyNumericSetting('wordChoiceCount', value)}
                  />
                ) : (
                  room.settings.wordChoiceCount
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
                    disabled={!isHost}
                    onChange={(value) => controls.applyNumericSetting('hintRevealSec', value)}
                  />
                ) : (
                  `${room.settings.hintRevealSec}s`
                )}
              </dd>
            </div>
            <div>
              <dt>힌트 글자 수</dt>
              <dd>
                {isHost ? (
                  <SettingSelect
                    value={room.settings.hintLetterCount}
                    options={[1, 2, 3]}
                    disabled={!isHost}
                    onChange={(value) => controls.applyNumericSetting('hintLetterCount', value)}
                  />
                ) : (
                  room.settings.hintLetterCount
                )}
              </dd>
            </div>
            <div>
              <dt>출제 순서</dt>
              <dd>
                {isHost ? (
                  <SettingEnumSelect
                    value={room.settings.drawerOrderMode}
                    options={[
                      { value: 'JOIN_ORDER', label: '입장순' },
                      { value: 'RANDOM', label: '랜덤' },
                    ]}
                    onChange={(value) => controls.applySetting('drawerOrderMode', value)}
                  />
                ) : room.settings.drawerOrderMode === 'RANDOM' ? (
                  '랜덤'
                ) : (
                  '입장순'
                )}
              </dd>
            </div>
            <div>
              <dt>종료 방식</dt>
              <dd>
                {isHost ? (
                  <SettingEnumSelect
                    value={room.settings.endMode}
                    options={[
                      { value: 'FIRST_CORRECT', label: '첫 정답' },
                      { value: 'TIME_OR_ALL_CORRECT', label: '시간 또는 전원 정답' },
                    ]}
                    onChange={(value) => controls.applySetting('endMode', value)}
                  />
                ) : room.settings.endMode === 'FIRST_CORRECT' ? (
                  '첫 정답'
                ) : (
                  '시간 또는 전원 정답'
                )}
              </dd>
            </div>
            {room.roomType === 'PRIVATE' ? (
              <>
                <div>
                  <dt>단어 모드</dt>
                  <dd>
                    {isHost ? (
                      <SettingEnumSelect
                        value={room.settings.customWordMode}
                        options={[
                          { value: 'BASE_PLUS_CUSTOM', label: '기본 + 커스텀' },
                          { value: 'CUSTOM_ONLY', label: '커스텀만' },
                        ]}
                        onChange={(value) => controls.applySetting('customWordMode', value)}
                      />
                    ) : room.settings.customWordMode === 'CUSTOM_ONLY' ? (
                      '커스텀만'
                    ) : (
                      '기본 + 커스텀'
                    )}
                  </dd>
                </div>
                <div className="room-lobby__settings-field--wide">
                  <dt>커스텀 단어</dt>
                  <dd>
                    <textarea
                      value={room.settings.customWordsRaw}
                      disabled={!isHost}
                      placeholder="쉼표 또는 줄바꿈으로 단어를 입력하세요"
                      onChange={(event) => controls.applySetting('customWordsRaw', event.target.value)}
                    />
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </article>
      </div>
    </section>
  )
}

type SettingSelectProps = {
  disabled?: boolean
  onChange: (value: number) => void
  options: number[]
  suffix?: string
  value: number
}

function SettingSelect({ disabled = false, onChange, options, suffix = '', value }: SettingSelectProps) {
  return (
    <select value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
          {suffix}
        </option>
      ))}
    </select>
  )
}

type SettingEnumSelectProps<Value extends string> = {
  onChange: (value: Value) => void
  options: Array<{ value: Value; label: string }>
  value: Value
}

function SettingEnumSelect<Value extends GameSettings[keyof GameSettings] & string>({
  onChange,
  options,
  value,
}: SettingEnumSelectProps<Value>) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as Value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

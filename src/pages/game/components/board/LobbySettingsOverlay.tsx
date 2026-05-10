import './LobbySettingsOverlay.css'
import type { GameSettings, RoomState } from '../../../../entities/game/model'
import {
  CUSTOM_WORD_MODE_OPTIONS,
  END_MODE_OPTIONS,
  SETTING_OPTIONS,
  type NumericSettingKey,
} from '../../gamePageShared'

type LobbySettingsOverlayProps = {
  isHost: boolean
  isPrivateRoom: boolean
  onApplyEndMode: (value: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT') => void
  onApplyCustomWordMode: (value: 'CUSTOM_ONLY' | 'BASE_PLUS_CUSTOM') => void
  onApplyCustomWordsRaw: (value: string) => void
  onApplySetting: (key: NumericSettingKey, value: string) => void
  onCloseSettings: () => void
  onStartGame: () => void
  roomState: RoomState
  settings: GameSettings
  settingsOpen: boolean
}

export function LobbySettingsOverlay({
  isHost,
  isPrivateRoom,
  onApplyEndMode,
  onApplyCustomWordMode,
  onApplyCustomWordsRaw,
  onApplySetting,
  onCloseSettings,
  onStartGame,
  roomState,
  settings,
  settingsOpen,
}: LobbySettingsOverlayProps) {
  if (roomState !== 'LOBBY') {
    return null
  }

  const shouldShowCustomSettings = isPrivateRoom
  const isCustomOnlyWithoutRaw =
    shouldShowCustomSettings &&
    settings.customWordMode === 'CUSTOM_ONLY' &&
    settings.customWordsRaw.trim().length === 0
  const isStartDisabled = isHost && isCustomOnlyWithoutRaw

  return (
    <div
      className={
        settingsOpen
          ? 'canvas-overlay-card canvas-overlay-card-settings canvas-overlay-card-settings-open'
          : 'canvas-overlay-card canvas-overlay-card-settings canvas-overlay-card-settings-closed'
      }
      aria-hidden={!settingsOpen}
    >
      <div className="overlay-heading">
        <p className="panel-label">게임 설정</p>
      </div>
      <div className="lobby-grid">
        <label className="field">
          <span>라운드 수</span>
          <select
            className={!isHost ? 'select-no-caret' : undefined}
            disabled={!isHost}
            value={settings.roundCount}
            onChange={(event) => onApplySetting('roundCount', event.target.value)}
          >
            {SETTING_OPTIONS.roundCount.map((option) => (
              <option key={option} value={option}>
                {option} 라운드
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>그리기 시간</span>
          <select
            className={!isHost ? 'select-no-caret' : undefined}
            disabled={!isHost}
            value={settings.drawSec}
            onChange={(event) => onApplySetting('drawSec', event.target.value)}
          >
            {SETTING_OPTIONS.drawSec.map((option) => (
              <option key={option} value={option}>
                {option}초
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>단어 선택 시간</span>
          <select
            className={!isHost ? 'select-no-caret' : undefined}
            disabled={!isHost}
            value={settings.wordChoiceSec}
            onChange={(event) => onApplySetting('wordChoiceSec', event.target.value)}
          >
            {SETTING_OPTIONS.wordChoiceSec.map((option) => (
              <option key={option} value={option}>
                {option}초
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>선택 단어 수</span>
          <select
            className={!isHost ? 'select-no-caret' : undefined}
            disabled={!isHost}
            value={settings.wordChoiceCount}
            onChange={(event) => onApplySetting('wordChoiceCount', event.target.value)}
          >
            {SETTING_OPTIONS.wordChoiceCount.map((option) => (
              <option key={option} value={option}>
                {option}개
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>종료 정답자 수</span>
          <select
            className={!isHost ? 'select-no-caret' : undefined}
            disabled={!isHost}
            value={settings.endMode}
            onChange={(event) =>
              onApplyEndMode(event.target.value as 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT')
            }
          >
            {END_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>힌트 공개 주기</span>
          <select
            className={!isHost ? 'select-no-caret' : undefined}
            disabled={!isHost}
            value={settings.hintRevealSec}
            onChange={(event) => onApplySetting('hintRevealSec', event.target.value)}
          >
            {SETTING_OPTIONS.hintRevealSec.map((option) => (
              <option key={option} value={option}>
                {option}초
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>힌트 공개 글자 수</span>
          <select
            className={!isHost ? 'select-no-caret' : undefined}
            disabled={!isHost}
            value={settings.hintLetterCount}
            onChange={(event) => onApplySetting('hintLetterCount', event.target.value)}
          >
            {SETTING_OPTIONS.hintLetterCount.map((option) => (
              <option key={option} value={option}>
                {option}글자
              </option>
            ))}
          </select>
        </label>
        {shouldShowCustomSettings ? (
          <>
            <label className="field">
              <span>커스텀 단어 모드</span>
              <select
                className={!isHost ? 'select-no-caret' : undefined}
                disabled={!isHost}
                value={settings.customWordMode}
                onChange={(event) =>
                  onApplyCustomWordMode(event.target.value as 'CUSTOM_ONLY' | 'BASE_PLUS_CUSTOM')
                }
              >
                {CUSTOM_WORD_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>커스텀 단어 원문</span>
              <textarea
                className="settings-textarea"
                disabled={!isHost}
                value={settings.customWordsRaw}
                onChange={(event) => onApplyCustomWordsRaw(event.target.value)}
                placeholder="단어|설명,단어,단어|설명"
                rows={3}
              />
            </label>
          </>
        ) : null}
      </div>
      {isStartDisabled ? (
        <p className="settings-validation-text">
          CUSTOM_ONLY 모드에서는 커스텀 단어를 1개 이상 입력해야 시작할 수 있습니다.
        </p>
      ) : null}
      <div
        className={
          !isPrivateRoom && isHost
            ? 'button-row overlay-actions'
            : 'button-row overlay-actions overlay-actions-single'
        }
      >
        {!isPrivateRoom && isHost ? (
          <button
            type="button"
            className="primary-button"
            onClick={onStartGame}
            disabled={isStartDisabled}
          >
            게임 시작
          </button>
        ) : null}
        <button
          type="button"
          className="secondary-button settings-close-button"
          onClick={onCloseSettings}
        >
          닫기
        </button>
      </div>
    </div>
  )
}

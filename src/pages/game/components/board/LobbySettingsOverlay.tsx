import type { GameSettings, RoomState } from '../../../../entities/game/model'
import {
  END_MODE_OPTIONS,
  SETTING_OPTIONS,
  type NumericSettingKey,
} from '../../gamePageShared'

type LobbySettingsOverlayProps = {
  isHost: boolean
  onApplyEndMode: (value: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT') => void
  onApplySetting: (key: NumericSettingKey, value: string) => void
  onCloseSettings: () => void
  onStartGame: () => void
  roomState: RoomState
  settings: GameSettings
  settingsOpen: boolean
}

export function LobbySettingsOverlay({
  isHost,
  onApplyEndMode,
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
      </div>
      <div className="button-row overlay-actions">
        {isHost ? (
          <button type="button" className="primary-button" onClick={onStartGame}>
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

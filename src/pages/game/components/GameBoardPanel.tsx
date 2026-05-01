import type { RefObject, TransitionEvent as ReactTransitionEvent } from 'react'
import type {
  CanvasStroke,
  DrawingTool,
  GameSettings,
  Participant,
  RoundSummary,
  RoomState,
  TurnSummary,
} from '../../../entities/game/model'
import { CanvasBoard } from '../../../features/game-canvas/CanvasBoard'
import {
  END_MODE_OPTIONS,
  SETTING_OPTIONS,
  TOOL_COLORS,
  TOOL_COLORS_GRAYSCALE,
  getMaskedWord,
  type EarnedScore,
  type NumericSettingKey,
  type OverlayPreview,
  type StageOverlayPhase,
  type TurnEndOverlaySnapshot,
  type ViewerRole,
} from '../gamePageShared'

type GameBoardPanelProps = {
  centerPanelRef: RefObject<HTMLElement | null>
  roomState: RoomState
  boardStrokes: CanvasStroke[]
  canDraw: boolean
  tool: DrawingTool
  activePaletteColor: string
  size: number
  isHost: boolean
  settingsOpen: boolean
  settings: GameSettings
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  viewerRole: ViewerRole
  drawerName: string
  nextDrawerName: string | null
  previewMode: OverlayPreview
  activeStageOverlay: StageOverlayPhase | null
  stageOverlayOpen: boolean
  shouldShowSecretWordBanner: boolean
  isSecretWordBannerClosed: boolean
  revealedHintCount: number
  turnEndOverlaySnapshot: TurnEndOverlaySnapshot | null
  earnedScores: EarnedScore[]
  ranking: Participant[]
  canUseFullPalette: boolean
  isSharedDrawingPhase: boolean
  forcedPaletteColor?: string
  onSendStrokeChunk: (stroke: CanvasStroke) => void
  onCommitStroke: (stroke: CanvasStroke) => void
  onToggleSettings: () => void
  onApplySetting: (key: NumericSettingKey, value: string) => void
  onApplyEndMode: (value: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT') => void
  onStartGame: () => void
  onCloseSettings: () => void
  onStageOverlayTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  onRequestWordChoice: (word: string) => void
  onSetTool: (tool: DrawingTool) => void
  onClearCanvas: () => void
  onSetSize: (size: number) => void
  onSetColor: (color: string) => void
}

export function GameBoardPanel({
  centerPanelRef,
  roomState,
  boardStrokes,
  canDraw,
  tool,
  activePaletteColor,
  size,
  isHost,
  settingsOpen,
  settings,
  currentRound,
  currentTurn,
  viewerRole,
  drawerName,
  nextDrawerName,
  previewMode,
  activeStageOverlay,
  stageOverlayOpen,
  shouldShowSecretWordBanner,
  isSecretWordBannerClosed,
  revealedHintCount,
  turnEndOverlaySnapshot,
  earnedScores,
  ranking,
  canUseFullPalette,
  isSharedDrawingPhase,
  forcedPaletteColor,
  onSendStrokeChunk,
  onCommitStroke,
  onToggleSettings,
  onApplySetting,
  onApplyEndMode,
  onStartGame,
  onCloseSettings,
  onStageOverlayTransitionEnd,
  onRequestWordChoice,
  onSetTool,
  onClearCanvas,
  onSetSize,
  onSetColor,
}: GameBoardPanelProps) {
  return (
    <section ref={centerPanelRef} className="panel game-center-panel">
      <div className="board-shell">
        <div className="board-frame">
          <div className="grid-overlay" />
          <CanvasBoard
            strokes={boardStrokes}
            canDraw={canDraw}
            tool={tool}
            color={tool === 'ERASER' ? '#ffffff' : activePaletteColor}
            size={Math.max(2, size * 2)}
            onSendStrokeChunk={onSendStrokeChunk}
            onCommitStroke={onCommitStroke}
          />

          {roomState === 'LOBBY' ? (
            <button
              type="button"
              className={settingsOpen ? 'board-settings-toggle secondary-button board-settings-toggle-hidden' : 'board-settings-toggle secondary-button'}
              onClick={onToggleSettings}
            >
              {isHost ? '설정 열기' : '설정 보기'}
            </button>
          ) : null}

          {shouldShowSecretWordBanner && currentTurn ? (
            <div
              key={
                viewerRole === 'drawer'
                  ? `${currentTurn.turnId}-${currentTurn.selectedWord ?? 'hidden'}`
                  : `${currentTurn.turnId}-masked-${currentTurn.answerLength ?? 'unknown'}`
              }
              className={
                isSecretWordBannerClosed
                  ? `secret-word-banner${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-closed`
                  : `secret-word-banner secret-word-banner-landing${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-open`
              }
            >
              {viewerRole === 'drawer'
                ? currentTurn.selectedWord ?? getMaskedWord(null, 0, currentTurn.answerLength)
                : getMaskedWord(currentTurn.selectedWord, revealedHintCount, currentTurn.answerLength)}
            </div>
          ) : null}

          {roomState === 'LOBBY' ? (
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
                    onChange={(event) => onApplyEndMode(event.target.value as 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT')}
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
                <button type="button" className="secondary-button settings-close-button" onClick={onCloseSettings}>
                  닫기
                </button>
              </div>
            </div>
          ) : null}

          {roomState === 'RUNNING' ? (
            <div
              className={
                activeStageOverlay === 'gameStart' && stageOverlayOpen
                  ? 'canvas-full-overlay canvas-full-overlay-open'
                  : 'canvas-full-overlay canvas-full-overlay-closed'
              }
              aria-hidden={activeStageOverlay !== 'gameStart'}
              onTransitionEnd={onStageOverlayTransitionEnd}
            >
              <strong>게임을 시작합니다.</strong>
            </div>
          ) : null}

          {roomState === 'RUNNING' ? (
            <div
              className={
                activeStageOverlay === 'roundStart' && stageOverlayOpen
                  ? 'canvas-full-overlay canvas-full-overlay-open'
                  : 'canvas-full-overlay canvas-full-overlay-closed'
              }
              aria-hidden={activeStageOverlay !== 'roundStart'}
              onTransitionEnd={onStageOverlayTransitionEnd}
            >
              <strong>{currentRound ? `${currentRound.roundNo}라운드` : '1라운드'}</strong>
            </div>
          ) : null}

          {roomState === 'RUNNING' && currentTurn ? (
            <div
              className={
                activeStageOverlay === 'wordChoice' && stageOverlayOpen
                  ? 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-open'
                  : 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-closed'
              }
              aria-hidden={activeStageOverlay !== 'wordChoice'}
              onTransitionEnd={onStageOverlayTransitionEnd}
            >
              <div className="overlay-heading">
                <strong>
                  {viewerRole === 'drawer' && currentTurn.wordChoices.length > 0
                    ? '제시어를 선택해주세요.'
                    : `${drawerName}님이 제시어를 선택중입니다.`}
                </strong>
              </div>
              {currentTurn.wordChoices.length > 0 ? (
                <div className={`button-row overlay-actions word-choice-actions word-choice-actions-count-${currentTurn.wordChoices.length}`}>
                  {currentTurn.wordChoices.map((word) => (
                    <button
                      key={word}
                      type="button"
                      className="word-choice-button"
                      onClick={() => onRequestWordChoice(word)}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {roomState === 'RUNNING' ? (
            <div
              className={
                activeStageOverlay === 'turnStart' && stageOverlayOpen
                  ? 'canvas-full-overlay canvas-full-overlay-open'
                  : 'canvas-full-overlay canvas-full-overlay-closed'
              }
              aria-hidden={activeStageOverlay !== 'turnStart'}
              onTransitionEnd={onStageOverlayTransitionEnd}
            >
              <strong>{`${drawerName}님이 그림을 그립니다.`}</strong>
              {nextDrawerName ? <span>{`다음은 ${nextDrawerName}님`}</span> : null}
            </div>
          ) : null}

          {roomState === 'RUNNING' ? (
            <div
              className={
                activeStageOverlay === 'turnEnd' && stageOverlayOpen
                  ? 'canvas-full-overlay canvas-full-overlay-open canvas-full-overlay-turn-end'
                  : 'canvas-full-overlay canvas-full-overlay-closed canvas-full-overlay-turn-end'
              }
              aria-hidden={activeStageOverlay !== 'turnEnd'}
              onTransitionEnd={onStageOverlayTransitionEnd}
            >
              <div className="canvas-full-overlay-panel">
                <div className="turn-end-summary">
                  <p className="turn-end-answer">
                    <span className="turn-end-answer-prefix">정답은</span>
                    <strong className="turn-end-answer-word">
                      {turnEndOverlaySnapshot?.answerText ?? currentTurn?.selectedWord ?? getMaskedWord(null, 0, currentTurn?.answerLength)}
                    </strong>
                    <span className="turn-end-answer-suffix">입니다.</span>
                  </p>
                  <div className="earned-score-content turn-end-earned-score-content">
                    <div className="earned-score-table">
                      <div className="earned-score-table-head" aria-hidden="true">
                        <span className="score-col-rank">순위</span>
                        <span className="score-col-name">참여자</span>
                        <span className="score-col-result">결과</span>
                        <span className="score-col-points">점수</span>
                      </div>
                      <div className="earned-score-table-body">
                        {(turnEndOverlaySnapshot?.earnedScores ?? earnedScores).map((row, index) => (
                          <div
                            key={row.sessionId}
                            className={
                              row.role === 'correct'
                                ? 'earned-score-row earned-score-row-correct'
                                : row.role === 'drawer'
                                  ? 'earned-score-row earned-score-row-drawer'
                                  : 'earned-score-row'
                            }
                          >
                            <span className="earned-score-rank score-col-rank">{index + 1}</span>
                            <span className="earned-score-name score-col-name">{row.nickname}</span>
                            <span
                              className={
                                row.role === 'correct'
                                  ? 'earned-score-role earned-score-role-correct score-col-result'
                                  : row.role === 'drawer'
                                    ? 'earned-score-role earned-score-role-drawer score-col-result'
                                    : 'earned-score-role score-col-result'
                              }
                            >
                              {row.role === 'correct' ? '정답' : row.role === 'drawer' ? '출제자' : '미정답'}
                            </span>
                            <strong className="earned-score-points score-col-points">{row.score} pts</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {previewMode === 'gameResult' ? (
            <div className="canvas-result-screen">
              {ranking.map((participant, index) => (
                <div key={participant.sessionId} className={index === 0 ? 'result-rank result-rank-winner' : 'result-rank'}>
                  <strong>{`${index + 1}# ${participant.nickname} ${participant.score} pts`}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="tool-row">
          <div className="tool-main-actions">
            <button
              type="button"
              className={tool === 'PEN' ? 'primary-button' : 'secondary-button'}
              onClick={() => onSetTool('PEN')}
              disabled={!canDraw}
            >
              펜
            </button>
            <button
              type="button"
              className={tool === 'ERASER' ? 'primary-button' : 'secondary-button'}
              onClick={() => onSetTool('ERASER')}
              disabled={!canDraw}
            >
              지우개
            </button>
            <button
              type="button"
              className={tool === 'FILL' ? 'primary-button' : 'secondary-button'}
              onClick={() => onSetTool('FILL')}
              disabled={!canDraw}
            >
              채우기
            </button>
            <button type="button" className="secondary-button" onClick={onClearCanvas} disabled={!canDraw}>
              전체 지우기
            </button>
          </div>
          <label className="size-control">
            <span className="size-control-label">굵기 {size}</span>
            <input
              type="range"
              min={1}
              max={9}
              step={1}
              value={size}
              onChange={(event) => onSetSize(Number(event.target.value))}
              disabled={!canDraw}
            />
          </label>
          <div className="color-palette">
            {TOOL_COLORS.map((swatch, swatchIndex) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Select ${swatch}`}
                className={
                  swatch === activePaletteColor
                    ? 'color-swatch color-swatch-active'
                    : 'color-swatch'
                }
                style={
                  canUseFullPalette
                    ? { background: swatch }
                    : isSharedDrawingPhase && swatch === forcedPaletteColor
                      ? { background: swatch }
                      : { background: TOOL_COLORS_GRAYSCALE[swatchIndex] }
                }
                onClick={() => onSetColor(swatch)}
                disabled={!canUseFullPalette}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

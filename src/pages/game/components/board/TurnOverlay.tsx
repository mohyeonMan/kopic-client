import './TurnOverlay.css'
import type { TransitionEvent as ReactTransitionEvent } from 'react'
import type {
  Participant,
  RoundSummary,
  RoomState,
  TurnSummary,
} from '../../../../entities/game/model'
import type {
  EarnedScore,
  OverlayPreview,
  StageOverlayPhase,
  TurnEndOverlaySnapshot,
  ViewerRole,
} from '../../gamePageShared'
import { GameResultOverlay } from './overlays/GameResultOverlay'
import { StageMessageOverlay } from './overlays/StageMessageOverlay'
import { TurnEndOverlay } from './overlays/TurnEndOverlay'
import { WordChoiceOverlay } from './overlays/WordChoiceOverlay'

type TurnOverlayProps = {
  activeStageOverlay: StageOverlayPhase | null
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  drawerName: string
  earnedScores: EarnedScore[]
  gameStartCountdownSec?: number
  nextTurnCountdownSec?: number
  nextDrawerName: string | null
  onRequestWordChoice: (choiceIndex: number) => void
  onStageOverlayTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  previewMode: OverlayPreview
  returnToLobbyCountdownSec?: number
  ranking: Participant[]
  roomState: RoomState
  roundStartCountdownSec?: number
  stageOverlayOpen: boolean
  turnStartCountdownSec?: number
  turnEndOverlaySnapshot: TurnEndOverlaySnapshot | null
  viewerRole: ViewerRole
  wordChoiceCountdownSec?: number
}

function formatCountdownText(countdownSec?: number, suffix = '') {
  return typeof countdownSec === 'number' ? `${Math.max(0, countdownSec)}${suffix}` : null
}

export function TurnOverlay({
  activeStageOverlay,
  currentRound,
  currentTurn,
  drawerName,
  earnedScores,
  gameStartCountdownSec,
  nextTurnCountdownSec,
  nextDrawerName,
  onRequestWordChoice,
  onStageOverlayTransitionEnd,
  previewMode,
  returnToLobbyCountdownSec,
  ranking,
  roomState,
  roundStartCountdownSec,
  stageOverlayOpen,
  turnStartCountdownSec,
  turnEndOverlaySnapshot,
  viewerRole,
  wordChoiceCountdownSec,
}: TurnOverlayProps) {
  const roundLabel = currentRound ? `${currentRound.roundNo}라운드` : '1라운드'
  const gameStartCountdownText = formatCountdownText(gameStartCountdownSec, '초 후,')
  const roundStartCountdownText = formatCountdownText(roundStartCountdownSec, '초 후,')
  const turnStartCountdownText = formatCountdownText(turnStartCountdownSec, '초 후,')
  const wordChoiceCountdownText = formatCountdownText(wordChoiceCountdownSec)
  const nextTurnCountdownText = formatCountdownText(nextTurnCountdownSec)
  const returnToLobbyCountdownText = formatCountdownText(returnToLobbyCountdownSec)

  return (
    <>
      {roomState === 'RUNNING' ? (
        <>
          <StageMessageOverlay
            activeStageOverlay={activeStageOverlay}
            countdownMessage="게임이 시작됩니다."
            countdownText={gameStartCountdownText}
            message="게임을 시작합니다."
            onTransitionEnd={onStageOverlayTransitionEnd}
            overlay="gameStart"
            stageOverlayOpen={stageOverlayOpen}
          />

          <StageMessageOverlay
            activeStageOverlay={activeStageOverlay}
            countdownMessage={`${roundLabel}가 시작됩니다.`}
            countdownText={roundStartCountdownText}
            message={roundLabel}
            onTransitionEnd={onStageOverlayTransitionEnd}
            overlay="roundStart"
            stageOverlayOpen={stageOverlayOpen}
          />

          <WordChoiceOverlay
            activeStageOverlay={activeStageOverlay}
            currentTurn={currentTurn}
            drawerName={drawerName}
            onRequestWordChoice={onRequestWordChoice}
            onTransitionEnd={onStageOverlayTransitionEnd}
            roomState={roomState}
            stageOverlayOpen={stageOverlayOpen}
            viewerRole={viewerRole}
            wordChoiceCountdownText={wordChoiceCountdownText}
          />

          <StageMessageOverlay
            activeStageOverlay={activeStageOverlay}
            countdownMessage={`${drawerName}님이 그림을 그립니다.`}
            countdownText={turnStartCountdownText}
            message={`${drawerName}님이 그림을 그립니다.`}
            onTransitionEnd={onStageOverlayTransitionEnd}
            overlay="turnStart"
            secondaryText={nextDrawerName ? `다음은 ${nextDrawerName}님` : null}
            stageOverlayOpen={stageOverlayOpen}
          />

          <TurnEndOverlay
            activeStageOverlay={activeStageOverlay}
            currentTurn={currentTurn}
            earnedScores={earnedScores}
            nextTurnCountdownText={nextTurnCountdownText}
            onTransitionEnd={onStageOverlayTransitionEnd}
            stageOverlayOpen={stageOverlayOpen}
            turnEndOverlaySnapshot={turnEndOverlaySnapshot}
          />
        </>
      ) : null}

      <GameResultOverlay
        previewMode={previewMode}
        ranking={ranking}
        returnToLobbyCountdownText={returnToLobbyCountdownText}
      />
    </>
  )
}

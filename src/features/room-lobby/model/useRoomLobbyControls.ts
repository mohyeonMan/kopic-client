/**
 * useRoomLobbyControls
 *
 * 책임:
 * - room lobby host controls orchestration
 * - settings 변경을 optimistic local state와 server command로 반영
 *
 * 하지 않는 것:
 * - WebSocket connection 직접 접근
 * - settings UI presentation
 * - room snapshot decoding
 *
 * side effect:
 * - settings update/game start command 전송
 * - settings optimistic store patch
 */
import type { GameSettings } from '@/entities/game/model/gameTypes'
import { useGameStore } from '@/entities/game/model/gameStore'
import { gameSessionCommands } from '@/features/game-session/model/gameSessionCommandGateway'

export function useRoomLobbyControls() {
  const patchSettings = useGameStore((state) => state.patchSettings)
  const settings = useGameStore((state) => state.room.settings)

  const applySetting = <Key extends keyof GameSettings>(key: Key, value: GameSettings[Key]) => {
    const nextSettings = {
      ...settings,
      [key]: value,
    }
    patchSettings({ [key]: value } as Partial<GameSettings>)
    gameSessionCommands.sendSettingsUpdate(nextSettings)
  }

  const applyNumericSetting = (key: keyof Pick<
    GameSettings,
    'drawSec' | 'hintLetterCount' | 'hintRevealSec' | 'roundCount' | 'wordChoiceCount' | 'wordChoiceSec'
  >, value: number) => {
    applySetting(key, value)
  }

  const startGame = () => {
    gameSessionCommands.sendGameStart()
  }

  return {
    applySetting,
    applyNumericSetting,
    startGame,
  }
}

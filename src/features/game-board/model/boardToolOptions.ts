/**
 * boardToolOptions
 *
 * 책임:
 * - game-board feature의 drawing tool/color option 정의
 *
 * 하지 않는 것:
 * - shared palette 역할
 * - server protocol color mapping
 * - toolbar UI state 관리
 *
 * 의존:
 * - game drawing tool type
 *
 * 사용 위치:
 * - GameBoardPanel
 */
import type { DrawingTool } from '@/entities/game/model/gameTypes'

export const BOARD_TOOLS: DrawingTool[] = ['PEN', 'ERASER', 'FILL']

export const BOARD_COLORS = [
  '#203247',
  '#d14b3f',
  '#ef9b47',
  '#f2c14e',
  '#5f8d4e',
  '#1f8a8a',
  '#4aa3b8',
  '#5f6dd9',
  '#9656a2',
  '#bd6a88',
  '#8d6e63',
  '#111111',
] as const


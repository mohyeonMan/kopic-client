import type { CanvasStroke } from '@/entities/game/model'
import { createUUID } from '../../../shared/lib/createUUID'

export type DraftStroke = Omit<CanvasStroke, 'id'>

export function buildCommittedStroke(draftStroke: DraftStroke): CanvasStroke {
  return {
    id: createUUID(),
    ...draftStroke,
  }
}

import type { CanvasStroke } from '@/entities/game/model'
import { createUUID } from '../../../shared/lib/createUUID'

export type DraftStroke = Omit<CanvasStroke, 'id'>

export function createCanvasStrokeCid() {
  return `cid_${createUUID().replaceAll('-', '').slice(0, 6)}`
}

export function buildCommittedStroke(draftStroke: DraftStroke): CanvasStroke {
  return {
    id: createUUID(),
    ...draftStroke,
  }
}

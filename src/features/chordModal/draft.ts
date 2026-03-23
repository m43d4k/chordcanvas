import {
  MINIMUM_DIAGRAM_FRET_COUNT,
  getChordForms,
  summarizeChord,
  toFretting,
  type ChordQuality,
  type Fretting,
  type PitchClassName,
  type StringState,
} from '../../music/chords'
import type { ChordBlockState } from '../../project/projectFile'

const MAX_MANUAL_FRET_COUNT = 12

export interface CurrentChordDraftSource {
  currentChordName: string
  currentFretting: Fretting
  manualFretCount: number
  manualStartFret: number
  selectedFormId: string
  selectedQuality: ChordQuality
  selectedRoot: PitchClassName
}

export interface ChordDraftState {
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  fretting: Fretting
  chordName: string
  manualStartFret: number
  manualFretCount: number
}

export type ChordModalSession =
  | {
      kind: 'stock'
      draft: ChordDraftState
    }
  | {
      kind: 'layout'
      draft: ChordDraftState
      targetRowId: string
    }
  | {
      blockId: string
      draft: ChordDraftState
      kind: 'edit'
    }

export function clampManualFretCount(value: number): number {
  return Math.min(
    MAX_MANUAL_FRET_COUNT,
    Math.max(MINIMUM_DIAGRAM_FRET_COUNT, value),
  )
}

export function copyFretting(fretting: Fretting): Fretting {
  return toFretting([...fretting])
}

export function createVisibleFrets(
  startFret: number,
  fretCount: number,
): number[] {
  return Array.from({ length: fretCount }, (_, index) => startFret + index)
}

export function createChordDraft(
  source: CurrentChordDraftSource,
): ChordDraftState {
  return {
    chordName: source.currentChordName,
    fretting: copyFretting(source.currentFretting),
    manualFretCount: clampManualFretCount(source.manualFretCount),
    manualStartFret: Math.max(1, source.manualStartFret),
    selectedFormId: source.selectedFormId,
    selectedQuality: source.selectedQuality,
    selectedRoot: source.selectedRoot,
  }
}

export function createChordDraftFromBlock(
  block: ChordBlockState,
  source: Pick<
    CurrentChordDraftSource,
    'selectedFormId' | 'selectedQuality' | 'selectedRoot'
  >,
): ChordDraftState {
  const viewport = summarizeChord(block.fretting).viewport

  return {
    chordName: block.displayName ?? '',
    fretting: copyFretting(block.fretting),
    manualFretCount: clampManualFretCount(viewport.fretCount),
    manualStartFret: viewport.startFret,
    selectedFormId: source.selectedFormId,
    selectedQuality: source.selectedQuality,
    selectedRoot: source.selectedRoot,
  }
}

export function syncDraftViewport(
  draft: ChordDraftState,
  fretting: Fretting,
): ChordDraftState {
  const viewport = summarizeChord(fretting).viewport

  return {
    ...draft,
    fretting: copyFretting(fretting),
    manualFretCount: clampManualFretCount(viewport.fretCount),
    manualStartFret: viewport.startFret,
  }
}

export function updateDraftRoot(
  draft: ChordDraftState,
  nextRoot: PitchClassName,
): ChordDraftState {
  const nextForms = getChordForms(nextRoot, draft.selectedQuality)
  const nextForm = nextForms[0]
  const nextFretting = nextForm ? copyFretting(nextForm.fretting) : draft.fretting

  return syncDraftViewport(
    {
      ...draft,
      selectedFormId: nextForm?.id ?? '',
      selectedRoot: nextRoot,
    },
    nextFretting,
  )
}

export function updateDraftQuality(
  draft: ChordDraftState,
  nextQuality: ChordQuality,
): ChordDraftState {
  const nextForms = getChordForms(draft.selectedRoot, nextQuality)
  const nextForm = nextForms[0]
  const nextFretting = nextForm ? copyFretting(nextForm.fretting) : draft.fretting

  return syncDraftViewport(
    {
      ...draft,
      selectedFormId: nextForm?.id ?? '',
      selectedQuality: nextQuality,
    },
    nextFretting,
  )
}

export function updateDraftForm(
  draft: ChordDraftState,
  nextFormId: string,
): ChordDraftState {
  const nextForm = getChordForms(draft.selectedRoot, draft.selectedQuality).find(
    (form) => form.id === nextFormId,
  )

  if (!nextForm) {
    return draft
  }

  return syncDraftViewport(
    {
      ...draft,
      selectedFormId: nextForm.id,
    },
    nextForm.fretting,
  )
}

export function updateDraftName(
  draft: ChordDraftState,
  chordName: string,
): ChordDraftState {
  return {
    ...draft,
    chordName,
  }
}

export function updateDraftManualStartFret(
  draft: ChordDraftState,
  value: string,
): ChordDraftState {
  const parsed = Number.parseInt(value, 10)

  return {
    ...draft,
    manualStartFret: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
  }
}

export function updateDraftManualFretCount(
  draft: ChordDraftState,
  value: string,
): ChordDraftState {
  const parsed = Number.parseInt(value, 10)

  return {
    ...draft,
    manualFretCount: Number.isNaN(parsed)
      ? MINIMUM_DIAGRAM_FRET_COUNT
      : clampManualFretCount(parsed),
  }
}

export function updateDraftStringState(
  draft: ChordDraftState,
  stringIndex: number,
  nextState: StringState,
): ChordDraftState {
  const nextFretting = [...draft.fretting]
  nextFretting[stringIndex] = nextState

  return {
    ...draft,
    fretting: toFretting(nextFretting),
  }
}

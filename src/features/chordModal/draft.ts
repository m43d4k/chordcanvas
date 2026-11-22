import {
  MAX_SINGLE_NOTE_FRET,
  MINIMUM_DIAGRAM_FRET_COUNT,
  deriveViewport,
  frettingToKey,
  getChordForms,
  getSingleNotePositions,
  summarizeChord,
  toFretting,
  type ChordQuality,
  type Fretting,
  type PitchClassName,
  type PlayedNote,
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
  isSingleNote?: true
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  fretting: Fretting
  chordName: string
  manualStartFret: number
  manualFretCount: number
}

export type ChordModalSession = {
  draft: ChordDraftState
  alternateDraft?: ChordDraftState
} & (
  | {
      kind: 'stock'
    }
  | {
      kind: 'layout'
      targetRowId: string
    }
  | {
      blockId: string
      kind: 'edit'
    }
)

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
  const { viewport, candidates } = summarizeChord(
    block.fretting,
    block.isSingleNote,
  )
  const selectedRoot = candidates[0]?.root ?? source.selectedRoot
  const selectedQuality = candidates[0]?.quality ?? source.selectedQuality
  const key = frettingToKey(block.fretting)
  const selectedForm = getChordForms(
    selectedRoot,
    selectedQuality,
    source.selectedFormId.startsWith('generated-'),
  ).find((form) => frettingToKey(form.fretting) === key)

  return {
    isSingleNote: block.isSingleNote,
    chordName: block.isSingleNote ? '' : (block.displayName ?? ''),
    fretting: copyFretting(block.fretting),
    manualFretCount: clampManualFretCount(viewport.fretCount),
    manualStartFret: viewport.startFret,
    selectedFormId: selectedForm?.id ?? '',
    selectedQuality,
    selectedRoot,
  }
}

export function createSingleNoteDraft(source: CurrentChordDraftSource) {
  return updateDraftNote(
    { ...createChordDraft(source), chordName: '', isSingleNote: true },
    'C',
  )
}

export function updateDraftNote(
  draft: ChordDraftState,
  note: PitchClassName,
): ChordDraftState {
  const [position] = getSingleNotePositions(note)
  if (!position) {
    throw new Error(`No guitar positions for ${note}`)
  }

  return updateDraftNotePosition(draft, position)
}

export function updateDraftNotePosition(
  draft: ChordDraftState,
  position: PlayedNote,
): ChordDraftState {
  const nextDraft = updateDraftStringState(
    draft,
    position.stringIndex,
    position.fret,
  )
  return syncDraftViewport(nextDraft, nextDraft.fretting)
}

export function syncDraftViewport(
  draft: ChordDraftState,
  fretting: Fretting,
): ChordDraftState {
  const viewport = deriveViewport(
    fretting,
    draft.isSingleNote ? MAX_SINGLE_NOTE_FRET : undefined,
  )

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
  const nextFretting = nextForm
    ? copyFretting(nextForm.fretting)
    : draft.fretting

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
  const nextFretting = nextForm
    ? copyFretting(nextForm.fretting)
    : draft.fretting

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
  const nextForm = getChordForms(
    draft.selectedRoot,
    draft.selectedQuality,
    nextFormId.startsWith('generated-'),
  ).find((form) => form.id === nextFormId)

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
  const startFret = Number.isNaN(parsed) ? 1 : Math.max(1, parsed)

  return {
    ...draft,
    manualStartFret: draft.isSingleNote
      ? Math.min(MAX_SINGLE_NOTE_FRET - draft.manualFretCount + 1, startFret)
      : startFret,
  }
}

export function updateDraftManualFretCount(
  draft: ChordDraftState,
  value: string,
): ChordDraftState {
  const parsed = Number.parseInt(value, 10)
  const manualFretCount = Number.isNaN(parsed)
    ? MINIMUM_DIAGRAM_FRET_COUNT
    : clampManualFretCount(parsed)

  return {
    ...draft,
    manualFretCount,
    manualStartFret: draft.isSingleNote
      ? Math.min(
          MAX_SINGLE_NOTE_FRET - manualFretCount + 1,
          draft.manualStartFret,
        )
      : draft.manualStartFret,
  }
}

export function updateDraftStringState(
  draft: ChordDraftState,
  stringIndex: number,
  nextState: StringState,
): ChordDraftState {
  if (
    draft.isSingleNote &&
    (nextState === 'x' || nextState > MAX_SINGLE_NOTE_FRET)
  ) {
    return draft
  }

  const nextFretting = draft.isSingleNote
    ? draft.fretting.map<StringState>(() => 'x')
    : [...draft.fretting]
  nextFretting[stringIndex] = nextState

  return {
    ...draft,
    fretting: toFretting(nextFretting),
  }
}

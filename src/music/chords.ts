export const PITCH_CLASSES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

const CHORD_DEFINITIONS = {
  major: {
    intervals: [0, 4, 7],
    label: 'major',
    priority: 0,
    symbol: '',
  },
  minor: {
    intervals: [0, 3, 7],
    label: 'minor',
    priority: 1,
    symbol: 'm',
  },
  '5': {
    intervals: [0, 7],
    label: '5',
    priority: 2,
    symbol: '5',
  },
  sus2: {
    intervals: [0, 2, 7],
    label: 'sus2',
    priority: 3,
    symbol: 'sus2',
  },
  sus4: {
    intervals: [0, 5, 7],
    label: 'sus4',
    priority: 4,
    symbol: 'sus4',
  },
  dim: {
    intervals: [0, 3, 6],
    label: 'dim',
    priority: 12,
    symbol: 'dim',
  },
  aug: {
    intervals: [0, 4, 8],
    label: 'aug',
    priority: 13,
    symbol: 'aug',
  },
  '6': {
    intervals: [0, 4, 7, 9],
    label: '6',
    priority: 5,
    symbol: '6',
  },
  m6: {
    intervals: [0, 3, 7, 9],
    label: 'm6',
    priority: 6,
    symbol: 'm6',
  },
  '7': {
    intervals: [0, 4, 7, 10],
    label: '7',
    priority: 7,
    symbol: '7',
  },
  maj7: {
    intervals: [0, 4, 7, 11],
    label: 'maj7',
    priority: 8,
    symbol: 'maj7',
  },
  m7: {
    intervals: [0, 3, 7, 10],
    label: 'm7',
    priority: 9,
    symbol: 'm7',
  },
  m7b5: {
    intervals: [0, 3, 6, 10],
    label: 'm7b5',
    priority: 14,
    symbol: 'm7b5',
  },
  dim7: {
    intervals: [0, 3, 6, 9],
    label: 'dim7',
    priority: 15,
    symbol: 'dim7',
  },
  add9: {
    intervals: [0, 4, 7, 14],
    label: 'add9',
    priority: 10,
    symbol: 'add9',
  },
  maj9: {
    intervals: [0, 4, 7, 11, 14],
    label: 'maj9',
    priority: 16,
    symbol: 'maj9',
  },
  m9: {
    intervals: [0, 3, 7, 10, 14],
    label: 'm9',
    priority: 17,
    symbol: 'm9',
  },
  '7sus4': {
    intervals: [0, 5, 7, 10],
    label: '7sus4',
    priority: 11,
    symbol: '7sus4',
  },
} as const

export type ChordQuality = keyof typeof CHORD_DEFINITIONS

export const CHORD_INTERVALS = Object.fromEntries(
  Object.entries(CHORD_DEFINITIONS).map(([quality, definition]) => [
    quality,
    definition.intervals,
  ]),
) as unknown as Record<ChordQuality, readonly number[]>

export const CHORD_QUALITY_LABELS = Object.fromEntries(
  Object.entries(CHORD_DEFINITIONS).map(([quality, definition]) => [
    quality,
    definition.label,
  ]),
) as unknown as Record<ChordQuality, string>

export const MINIMUM_DIAGRAM_FRET_COUNT = 5

const CHORD_SYMBOLS = Object.fromEntries(
  Object.entries(CHORD_DEFINITIONS).map(([quality, definition]) => [
    quality,
    definition.symbol,
  ]),
) as unknown as Record<ChordQuality, string>

const CHORD_PRIORITY = Object.fromEntries(
  Object.entries(CHORD_DEFINITIONS).map(([quality, definition]) => [
    quality,
    definition.priority,
  ]),
) as unknown as Record<ChordQuality, number>

const NORMALIZED_INTERVALS = Object.fromEntries(
  Object.entries(CHORD_INTERVALS).map(([quality, intervals]) => [
    quality,
    normalizeIntervals(intervals),
  ]),
) as Record<ChordQuality, readonly number[]>

const STANDARD_TUNING_PITCHES = [4, 9, 2, 7, 11, 4] as const
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64] as const
const DEFAULT_DEGREE_LABELS = [
  'R',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  'b5',
  '5',
  '#5',
  '6',
  'b7',
  '7',
] as const
const EXTENDED_DEGREE_LABELS: Partial<Record<number, string>> = {
  13: 'b9',
  14: '9',
  15: '#9',
  17: '11',
  20: 'b13',
  21: '13',
}

type RelativeStringState = 'x' | number

export type PitchClassName = (typeof PITCH_CLASSES)[number]
export type StringState = 'x' | 0 | number
export type Fretting = readonly [
  StringState,
  StringState,
  StringState,
  StringState,
  StringState,
  StringState,
]

export interface PlayedNote {
  stringIndex: number
  fret: number
  midi: number
  pitchClass: number
  note: PitchClassName
}

export interface DiagramViewport {
  startFret: number
  fretCount: number
  isNutPosition: boolean
  visibleFrets: readonly number[]
  editableFrets: readonly number[]
}

export interface ChordCandidate {
  root: PitchClassName
  quality: ChordQuality
  bass: PitchClassName | null
  intervals: readonly number[]
  label: string
}

export interface ChordSummary {
  playedNotes: readonly PlayedNote[]
  uniqueNotes: readonly PitchClassName[]
  bassNote: PitchClassName | null
  viewport: DiagramViewport
  candidates: readonly ChordCandidate[]
  currentName: string
  chordTones: readonly PitchClassName[]
  stringDegreeLabels: readonly (string | null)[]
}

export interface ChordForm {
  id: string
  label: string
  fretting: Fretting
}

interface ScoredChordCandidate extends ChordCandidate {
  score: number
}

interface FrettingAnalysis {
  bassNote: PitchClassName | null
  playedNotes: readonly PlayedNote[]
  uniqueNotes: readonly PitchClassName[]
  uniquePitchClasses: readonly number[]
}

interface AbsoluteChordFormDefinition {
  id: string
  label: string
  root: PitchClassName
  quality: ChordQuality
  fretting: Fretting
}

interface RelativeChordFormDefinition {
  id: string
  label: string
  rootStringIndex: 0 | 1
  frets: readonly [
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
  ]
}

const ABSOLUTE_FORM_LIBRARY: readonly AbsoluteChordFormDefinition[] = [
  {
    id: 'open-c-major',
    label: 'Open C form',
    root: 'C',
    quality: 'major',
    fretting: toFretting(['x', 3, 2, 0, 1, 0]),
  },
  {
    id: 'open-d-major',
    label: 'Open D form',
    root: 'D',
    quality: 'major',
    fretting: toFretting(['x', 'x', 0, 2, 3, 2]),
  },
  {
    id: 'open-e-major',
    label: 'Open E form',
    root: 'E',
    quality: 'major',
    fretting: toFretting([0, 2, 2, 1, 0, 0]),
  },
  {
    id: 'open-g-major',
    label: 'Open G form',
    root: 'G',
    quality: 'major',
    fretting: toFretting([3, 2, 0, 0, 0, 3]),
  },
  {
    id: 'open-a-major',
    label: 'Open A form',
    root: 'A',
    quality: 'major',
    fretting: toFretting(['x', 0, 2, 2, 2, 0]),
  },
  {
    id: 'open-a-minor',
    label: 'Open Am form',
    root: 'A',
    quality: 'minor',
    fretting: toFretting(['x', 0, 2, 2, 1, 0]),
  },
  {
    id: 'open-d-minor',
    label: 'Open Dm form',
    root: 'D',
    quality: 'minor',
    fretting: toFretting(['x', 'x', 0, 2, 3, 1]),
  },
  {
    id: 'open-e-minor',
    label: 'Open Em form',
    root: 'E',
    quality: 'minor',
    fretting: toFretting([0, 2, 2, 0, 0, 0]),
  },
  {
    id: 'open-a7',
    label: 'Open A7 form',
    root: 'A',
    quality: '7',
    fretting: toFretting(['x', 0, 2, 0, 2, 0]),
  },
  {
    id: 'open-c7',
    label: 'Open C7 form',
    root: 'C',
    quality: '7',
    fretting: toFretting(['x', 3, 2, 3, 1, 0]),
  },
  {
    id: 'open-d7',
    label: 'Open D7 form',
    root: 'D',
    quality: '7',
    fretting: toFretting(['x', 'x', 0, 2, 1, 2]),
  },
  {
    id: 'open-e7',
    label: 'Open E7 form',
    root: 'E',
    quality: '7',
    fretting: toFretting([0, 2, 0, 1, 0, 0]),
  },
  {
    id: 'open-g7',
    label: 'Open G7 form',
    root: 'G',
    quality: '7',
    fretting: toFretting([3, 2, 0, 0, 0, 1]),
  },
  {
    id: 'open-a-maj7',
    label: 'Open Amaj7 form',
    root: 'A',
    quality: 'maj7',
    fretting: toFretting(['x', 0, 2, 1, 2, 0]),
  },
  {
    id: 'open-c-maj7',
    label: 'Open Cmaj7 form',
    root: 'C',
    quality: 'maj7',
    fretting: toFretting(['x', 3, 2, 0, 0, 0]),
  },
  {
    id: 'open-d-maj7',
    label: 'Open Dmaj7 form',
    root: 'D',
    quality: 'maj7',
    fretting: toFretting(['x', 'x', 0, 2, 2, 2]),
  },
  {
    id: 'open-e-maj7',
    label: 'Open Emaj7 form',
    root: 'E',
    quality: 'maj7',
    fretting: toFretting([0, 2, 1, 1, 0, 0]),
  },
  {
    id: 'open-a-m7',
    label: 'Open Am7 form',
    root: 'A',
    quality: 'm7',
    fretting: toFretting(['x', 0, 2, 0, 1, 0]),
  },
  {
    id: 'open-d-m7',
    label: 'Open Dm7 form',
    root: 'D',
    quality: 'm7',
    fretting: toFretting(['x', 'x', 0, 2, 1, 1]),
  },
  {
    id: 'open-e-m7',
    label: 'Open Em7 form',
    root: 'E',
    quality: 'm7',
    fretting: toFretting([0, 2, 0, 0, 0, 0]),
  },
  {
    id: 'open-a-sus4',
    label: 'Open Asus4 form',
    root: 'A',
    quality: 'sus4',
    fretting: toFretting(['x', 0, 2, 2, 3, 0]),
  },
  {
    id: 'open-d-sus4',
    label: 'Open Dsus4 form',
    root: 'D',
    quality: 'sus4',
    fretting: toFretting(['x', 'x', 0, 2, 3, 3]),
  },
  {
    id: 'open-e-sus4',
    label: 'Open Esus4 form',
    root: 'E',
    quality: 'sus4',
    fretting: toFretting([0, 2, 2, 2, 0, 0]),
  },
]

const RELATIVE_FORM_LIBRARY: Record<
  ChordQuality,
  readonly RelativeChordFormDefinition[]
> = {
  major: [
    {
      id: '6th-root-major',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 1, 0, 0],
    },
    {
      id: '5th-root-major',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 2, 2, 0],
    },
  ],
  minor: [
    {
      id: '6th-root-minor',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 0, 0, 0],
    },
    {
      id: '5th-root-minor',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 2, 1, 0],
    },
  ],
  '5': [
    {
      id: '6th-root-power',
      label: '6th-string power form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 'x', 'x', 'x'],
    },
    {
      id: '5th-root-power',
      label: '5th-string power form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 2, 'x', 'x'],
    },
  ],
  sus2: [
    {
      id: '6th-root-sus2',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 4, 4, 0, 0],
    },
    {
      id: '5th-root-sus2',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 2, 0, 0],
    },
  ],
  sus4: [
    {
      id: '6th-root-sus4',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 2, 0, 0],
    },
    {
      id: '5th-root-sus4',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 2, 3, 0],
    },
  ],
  dim: [
    {
      id: '6th-root-dim',
      label: 'Diminished triad form',
      rootStringIndex: 0,
      frets: [0, 1, 2, 0, 'x', 'x'],
    },
  ],
  aug: [
    {
      id: '6th-root-aug',
      label: 'Augmented form',
      rootStringIndex: 0,
      frets: [0, 3, 2, 1, 1, 'x'],
    },
  ],
  '6': [
    {
      id: '6th-root-6',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 1, 2, 0],
    },
    {
      id: '5th-root-6',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 2, 2, 2],
    },
  ],
  m6: [
    {
      id: '6th-root-m6',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 0, 2, 0],
    },
    {
      id: '5th-root-m6',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 2, 1, 2],
    },
  ],
  '7': [
    {
      id: '6th-root-7',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 0, 1, 0, 0],
    },
    {
      id: '5th-root-7',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 0, 2, 0],
    },
  ],
  maj7: [
    {
      id: '6th-root-maj7',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 1, 1, 0, 0],
    },
    {
      id: '5th-root-maj7',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 1, 2, 0],
    },
  ],
  m7: [
    {
      id: '6th-root-m7',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 0, 0, 0, 0],
    },
    {
      id: '5th-root-m7',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 0, 1, 0],
    },
  ],
  m7b5: [
    {
      id: '6th-root-m7b5',
      label: 'Half-diminished form',
      rootStringIndex: 0,
      frets: [0, 1, 0, 0, 'x', 'x'],
    },
  ],
  dim7: [
    {
      id: '6th-root-dim7',
      label: 'Diminished seventh form',
      rootStringIndex: 0,
      frets: [0, 1, 2, 0, 2, 'x'],
    },
  ],
  add9: [
    {
      id: '6th-root-add9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 1, 0, 2],
    },
    {
      id: '5th-root-add9',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 4, 2, 0],
    },
  ],
  maj9: [
    {
      id: '6th-root-maj9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 'x', 1, 1, 0, 2],
    },
  ],
  m9: [
    {
      id: '6th-root-m9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 'x', 0, 0, 0, 2],
    },
  ],
  '7sus4': [
    {
      id: '6th-root-7sus4',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 0, 2, 0, 0],
    },
  ],
}

export const CHORD_QUALITIES = Object.keys(
  CHORD_INTERVALS,
) as readonly ChordQuality[]

export function toFretting(states: readonly StringState[]): Fretting {
  if (states.length !== 6) {
    throw new Error('Fretting must contain six string states')
  }

  return states as Fretting
}

export function mod12(value: number): number {
  return ((value % 12) + 12) % 12
}

export function pitchClassToName(value: number): PitchClassName {
  return PITCH_CLASSES[mod12(value)] ?? 'C'
}

export function pitchClassNameToValue(name: PitchClassName): number {
  return PITCH_CLASSES.indexOf(name)
}

export function frettingToKey(fretting: Fretting): string {
  return fretting.join('-')
}

function collectPlayedNotes(fretting: Fretting): readonly PlayedNote[] {
  return fretting.flatMap((state, stringIndex) => {
    if (state === 'x') {
      return []
    }

    const fret = state
    const openMidi = STANDARD_TUNING_MIDI[stringIndex]
    const openPitch = STANDARD_TUNING_PITCHES[stringIndex]

    if (openMidi === undefined || openPitch === undefined) {
      return []
    }

    const midi = openMidi + fret
    const pitchClass = mod12(openPitch + fret)

    return [
      {
        stringIndex,
        fret,
        midi,
        pitchClass,
        note: pitchClassToName(pitchClass),
      },
    ]
  })
}

function analyzeFretting(fretting: Fretting): FrettingAnalysis {
  const playedNotes = collectPlayedNotes(fretting)
  const seen = new Set<number>()
  const uniqueNotes: PitchClassName[] = []
  const uniquePitchClasses: number[] = []
  let lowestNote: PlayedNote | null = null

  for (const note of playedNotes) {
    if (!seen.has(note.pitchClass)) {
      seen.add(note.pitchClass)
      uniqueNotes.push(note.note)
      uniquePitchClasses.push(note.pitchClass)
    }

    if (!lowestNote || note.midi < lowestNote.midi) {
      lowestNote = note
    }
  }

  return {
    bassNote: lowestNote ? lowestNote.note : null,
    playedNotes,
    uniqueNotes,
    uniquePitchClasses: sortUniqueNumbers(uniquePitchClasses),
  }
}

function detectChordCandidatesFromAnalysis(
  analysis: FrettingAnalysis,
): readonly ChordCandidate[] {
  if (analysis.playedNotes.length === 0) {
    return []
  }

  const matches = analysis.uniquePitchClasses.flatMap<ScoredChordCandidate>(
    (rootPitchClass, rootIndex) => {
      const relativeIntervals = sortUniqueNumbers(
        analysis.uniquePitchClasses.map((pitchClass) =>
          mod12(pitchClass - rootPitchClass),
        ),
      )

      return CHORD_QUALITIES.flatMap((quality) => {
        const targetIntervals = NORMALIZED_INTERVALS[quality]

        if (!isSameIntervalSet(relativeIntervals, targetIntervals)) {
          return []
        }

        const root = pitchClassToName(rootPitchClass)
        const slashBass =
          analysis.bassNote && analysis.bassNote !== root
            ? analysis.bassNote
            : null

        return [
          {
            root,
            quality,
            bass: slashBass,
            intervals: targetIntervals,
            label: buildChordLabel(root, quality, slashBass),
            score:
              CHORD_PRIORITY[quality] +
              (slashBass ? 20 : 0) +
              rootIndex * 0.25 +
              Math.max(0, relativeIntervals.length - 3) * 0.5,
          },
        ]
      })
    },
  )

  return matches
    .sort((left, right) => left.score - right.score)
    .map((candidate) => ({
      root: candidate.root,
      quality: candidate.quality,
      bass: candidate.bass,
      intervals: candidate.intervals,
      label: candidate.label,
    }))
}

export function derivePlayedNotes(fretting: Fretting): readonly PlayedNote[] {
  return analyzeFretting(fretting).playedNotes
}

export function derivePlayableStringMidis(
  fretting: Fretting,
): readonly number[] {
  return analyzeFretting(fretting).playedNotes.map((note) => note.midi)
}

export function deriveUniqueNotes(
  fretting: Fretting,
): readonly PitchClassName[] {
  return analyzeFretting(fretting).uniqueNotes
}

export function deriveBassNote(fretting: Fretting): PitchClassName | null {
  return analyzeFretting(fretting).bassNote
}

export function deriveViewport(fretting: Fretting): DiagramViewport {
  const frettedValues = fretting.flatMap((state) =>
    typeof state === 'number' && state > 0 ? [state] : [],
  )

  if (frettedValues.length === 0) {
    return {
      startFret: 1,
      fretCount: MINIMUM_DIAGRAM_FRET_COUNT,
      isNutPosition: true,
      visibleFrets: range(1, MINIMUM_DIAGRAM_FRET_COUNT),
      editableFrets: range(1, MINIMUM_DIAGRAM_FRET_COUNT + 1),
    }
  }

  const minFret = Math.min(...frettedValues)
  const maxFret = Math.max(...frettedValues)
  const isNutPosition = maxFret <= 4
  const startFret = isNutPosition ? 1 : minFret
  const fretCount = Math.max(
    MINIMUM_DIAGRAM_FRET_COUNT,
    maxFret - startFret + 1,
  )
  const visibleFrets = range(startFret, startFret + fretCount - 1)
  const editableEnd = startFret + fretCount
  const editableFrets = range(startFret, editableEnd)

  return {
    startFret,
    fretCount,
    isNutPosition,
    visibleFrets,
    editableFrets,
  }
}

export function getChordToneNames(
  root: PitchClassName,
  quality: ChordQuality,
): readonly PitchClassName[] {
  const rootValue = pitchClassNameToValue(root)

  return normalizeIntervals(CHORD_INTERVALS[quality]).map((interval) =>
    pitchClassToName(rootValue + interval),
  )
}

export function buildChordLabel(
  root: PitchClassName,
  quality: ChordQuality,
  bass: PitchClassName | null = null,
): string {
  const slash = bass && bass !== root ? `/${bass}` : ''
  return `${root}${CHORD_SYMBOLS[quality]}${slash}`
}

export function detectChordCandidates(
  fretting: Fretting,
): readonly ChordCandidate[] {
  return detectChordCandidatesFromAnalysis(analyzeFretting(fretting))
}

export function summarizeChord(fretting: Fretting): ChordSummary {
  const analysis = analyzeFretting(fretting)
  const viewport = deriveViewport(fretting)
  const candidates = detectChordCandidatesFromAnalysis(analysis)
  const currentCandidate = candidates[0]

  return {
    playedNotes: analysis.playedNotes,
    uniqueNotes: analysis.uniqueNotes,
    bassNote: analysis.bassNote,
    viewport,
    candidates,
    currentName: currentCandidate?.label ?? 'Unrecognized',
    chordTones: currentCandidate
      ? getChordToneNames(currentCandidate.root, currentCandidate.quality)
      : [],
    stringDegreeLabels: deriveStringDegreeLabels(fretting, currentCandidate),
  }
}

export function deriveStringDegreeLabels(
  fretting: Fretting,
  candidate: ChordCandidate | null = detectChordCandidates(fretting)[0] ?? null,
): readonly (string | null)[] {
  if (!candidate) {
    return fretting.map(() => null)
  }

  const rootValue = pitchClassNameToValue(candidate.root)
  const degreeLabelByInterval = createDegreeLabelByInterval(candidate.quality)

  return fretting.map((state, stringIndex) => {
    if (typeof state !== 'number' || state === 0) {
      return null
    }

    const openPitch = STANDARD_TUNING_PITCHES[stringIndex]

    if (openPitch === undefined) {
      return null
    }

    const pitchClass = mod12(openPitch + state)
    const interval = mod12(pitchClass - rootValue)

    return (
      degreeLabelByInterval.get(interval) ?? DEFAULT_DEGREE_LABELS[interval] ?? null
    )
  })
}

export function getChordForms(
  root: PitchClassName,
  quality: ChordQuality,
): readonly ChordForm[] {
  const absoluteForms = ABSOLUTE_FORM_LIBRARY.filter(
    (form) => form.root === root && form.quality === quality,
  ).map(({ id, label, fretting }) => ({
    id,
    label,
    fretting,
  }))

  const movableForms = RELATIVE_FORM_LIBRARY[quality].map((form) => ({
    id: `${form.id}-${root}`,
    label: form.label,
    fretting: buildRelativeForm(root, form),
  }))

  const deduped = new Map<string, ChordForm>()

  ;[...absoluteForms, ...movableForms].forEach((form) => {
    const key = frettingToKey(form.fretting)

    if (!deduped.has(key)) {
      deduped.set(key, form)
    }
  })

  return [...deduped.values()]
}

function buildRelativeForm(
  root: PitchClassName,
  form: RelativeChordFormDefinition,
): Fretting {
  const anchorPitch = STANDARD_TUNING_PITCHES[form.rootStringIndex]
  const rootFret = mod12(pitchClassNameToValue(root) - anchorPitch)

  return toFretting(
    form.frets.map((state) =>
      state === 'x' ? 'x' : ((state + rootFret) as StringState),
    ),
  )
}

function range(start: number, end: number): readonly number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function normalizeIntervals(intervals: readonly number[]): readonly number[] {
  return sortUniqueNumbers(intervals.map((interval) => mod12(interval)))
}

function createDegreeLabelByInterval(quality: ChordQuality): Map<number, string> {
  return CHORD_INTERVALS[quality].reduce((labels, interval) => {
    labels.set(mod12(interval), getDegreeLabel(interval))
    return labels
  }, new Map<number, string>())
}

function getDegreeLabel(interval: number): string {
  return (
    EXTENDED_DEGREE_LABELS[interval] ??
    DEFAULT_DEGREE_LABELS[mod12(interval)] ??
    `${interval}`
  )
}

function sortUniqueNumbers(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right)
}

function isSameIntervalSet(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

export function isMuted(state: StringState): state is 'x' {
  return state === 'x'
}

export function isOpen(state: StringState): state is 0 {
  return state === 0
}

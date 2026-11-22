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
    optionalIntervals: [],
    label: 'major',
    priority: 0,
    symbol: '',
  },
  minor: {
    intervals: [0, 3, 7],
    optionalIntervals: [],
    label: 'minor',
    priority: 1,
    symbol: 'm',
  },
  '5': {
    intervals: [0, 7],
    optionalIntervals: [],
    label: '5',
    priority: 2,
    symbol: '5',
  },
  sus2: {
    intervals: [0, 2, 7],
    optionalIntervals: [],
    label: 'sus2',
    priority: 3,
    symbol: 'sus2',
  },
  sus4: {
    intervals: [0, 5, 7],
    optionalIntervals: [],
    label: 'sus4',
    priority: 4,
    symbol: 'sus4',
  },
  dim: {
    intervals: [0, 3, 6],
    optionalIntervals: [],
    label: 'dim',
    priority: 12,
    symbol: 'dim',
  },
  aug: {
    intervals: [0, 4, 8],
    optionalIntervals: [],
    label: 'aug',
    priority: 13,
    symbol: 'aug',
  },
  '6': {
    intervals: [0, 4, 7, 9],
    optionalIntervals: [7],
    label: '6',
    priority: 5,
    symbol: '6',
  },
  m6: {
    intervals: [0, 3, 7, 9],
    optionalIntervals: [7],
    label: 'm6',
    priority: 6,
    symbol: 'm6',
  },
  '7': {
    intervals: [0, 4, 7, 10],
    optionalIntervals: [7],
    label: '7',
    priority: 7,
    symbol: '7',
  },
  maj7: {
    intervals: [0, 4, 7, 11],
    optionalIntervals: [7],
    label: 'maj7',
    priority: 8,
    symbol: 'maj7',
  },
  m7: {
    intervals: [0, 3, 7, 10],
    optionalIntervals: [7],
    label: 'm7',
    priority: 9,
    symbol: 'm7',
  },
  m7b5: {
    intervals: [0, 3, 6, 10],
    optionalIntervals: [],
    label: 'm7b5',
    priority: 14,
    symbol: 'm7b5',
  },
  dim7: {
    intervals: [0, 3, 6, 9],
    optionalIntervals: [],
    label: 'dim7',
    priority: 15,
    symbol: 'dim7',
  },
  add9: {
    intervals: [0, 4, 7, 14],
    optionalIntervals: [7],
    label: 'add9',
    priority: 10,
    symbol: 'add9',
  },
  maj9: {
    intervals: [0, 4, 7, 11, 14],
    optionalIntervals: [7],
    label: 'maj9',
    priority: 16,
    symbol: 'maj9',
  },
  m9: {
    intervals: [0, 3, 7, 10, 14],
    optionalIntervals: [7],
    label: 'm9',
    priority: 17,
    symbol: 'm9',
  },
  '7sus4': {
    intervals: [0, 5, 7, 10],
    optionalIntervals: [7],
    label: '7sus4',
    priority: 11,
    symbol: '7sus4',
  },
  madd9: {
    intervals: [0, 3, 7, 14],
    optionalIntervals: [7],
    label: 'madd9',
    priority: 18,
    symbol: 'madd9',
  },
  mMaj7: {
    intervals: [0, 3, 7, 11],
    optionalIntervals: [7],
    label: 'mMaj7',
    priority: 19,
    symbol: 'mMaj7',
  },
  '6/9': {
    intervals: [0, 4, 7, 9, 14],
    optionalIntervals: [7],
    label: '6/9',
    priority: 20,
    symbol: '6/9',
  },
  '9': {
    intervals: [0, 4, 7, 10, 14],
    optionalIntervals: [7],
    label: '9',
    priority: 21,
    symbol: '9',
  },
  '11': {
    intervals: [0, 4, 7, 10, 14, 17],
    optionalIntervals: [7, 14],
    label: '11',
    priority: 24,
    symbol: '11',
  },
  '13': {
    intervals: [0, 4, 7, 10, 14, 21],
    optionalIntervals: [7, 14],
    label: '13',
    priority: 25,
    symbol: '13',
  },
  m11: {
    intervals: [0, 3, 7, 10, 14, 17],
    optionalIntervals: [7, 14],
    label: 'm11',
    priority: 26,
    symbol: 'm11',
  },
  '7b5': {
    intervals: [0, 4, 6, 10],
    optionalIntervals: [],
    label: '7b5',
    priority: 22,
    symbol: '7b5',
  },
  '7#5': {
    intervals: [0, 4, 8, 10],
    optionalIntervals: [],
    label: '7#5',
    priority: 23,
    symbol: '7#5',
  },
  '7b9': {
    intervals: [0, 4, 7, 10, 13],
    optionalIntervals: [7],
    label: '7b9',
    priority: 27,
    symbol: '7b9',
  },
  '7#9': {
    intervals: [0, 4, 7, 10, 15],
    optionalIntervals: [7],
    label: '7#9',
    priority: 28,
    symbol: '7#9',
  },
  '9sus4': {
    intervals: [0, 5, 7, 10, 14],
    optionalIntervals: [7],
    label: '9sus4',
    priority: 29,
    symbol: '9sus4',
  },
  '7#11': {
    intervals: [0, 4, 7, 10, 18],
    optionalIntervals: [7],
    label: '7#11',
    priority: 30,
    symbol: '7#11',
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

const NORMALIZED_OPTIONAL_INTERVALS = Object.fromEntries(
  Object.entries(CHORD_DEFINITIONS).map(([quality, definition]) => [
    quality,
    normalizeIntervals(definition.optionalIntervals),
  ]),
) as Record<ChordQuality, readonly number[]>

const STANDARD_TUNING_PITCHES = [4, 9, 2, 7, 11, 4] as const
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64] as const
const MAX_GENERATED_FORM_COUNT = 6
const GENERATED_FORM_MAX_FRET = 12
const GENERATED_FORM_FRET_SPAN = 3
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
  18: '#11',
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
  matchKind: 'exact' | 'omission' | 'inferred'
  omittedIntervals: readonly number[]
}

export interface ChordSummary {
  playedNotes: readonly PlayedNote[]
  uniqueNotes: readonly PitchClassName[]
  bassNote: PitchClassName | null
  viewport: DiagramViewport
  candidates: readonly ChordCandidate[]
  inferredCandidates: readonly ChordCandidate[]
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
  rootStringIndex: 0 | 1 | 2 | 3
  frets: readonly [
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
    RelativeStringState,
  ]
}

interface ScoredChordForm extends ChordForm {
  score: number
}

const GENERATED_FORM_CACHE = new Map<string, readonly ChordForm[]>()

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
  {
    id: 'open-b7',
    label: 'Open B7 form',
    root: 'B',
    quality: '7',
    fretting: toFretting(['x', 2, 1, 2, 0, 2]),
  },
  {
    id: 'open-c7-muted',
    label: 'C7',
    root: 'C',
    quality: '7',
    fretting: toFretting(['x', 3, 2, 3, 1, 'x']),
  },
  {
    id: 'open-f-maj7',
    label: 'Open Fmaj7 form',
    root: 'F',
    quality: 'maj7',
    fretting: toFretting(['x', 'x', 3, 2, 1, 0]),
  },
  {
    id: 'open-g-maj7',
    label: 'Open Gmaj7 form',
    root: 'G',
    quality: 'maj7',
    fretting: toFretting([3, 2, 0, 0, 0, 2]),
  },
  {
    id: 'open-c-add9',
    label: 'Open Cadd9 form',
    root: 'C',
    quality: 'add9',
    fretting: toFretting(['x', 3, 2, 0, 3, 3]),
  },
  {
    id: 'open-d-add9',
    label: 'Open Dadd9 form',
    root: 'D',
    quality: 'add9',
    fretting: toFretting(['x', 5, 4, 2, 3, 0]),
  },
  {
    id: 'open-d-sus2',
    label: 'Open Dsus2 form',
    root: 'D',
    quality: 'sus2',
    fretting: toFretting(['x', 'x', 0, 2, 3, 0]),
  },
  {
    id: 'open-a-sus2',
    label: 'Open Asus2 form',
    root: 'A',
    quality: 'sus2',
    fretting: toFretting(['x', 0, 2, 2, 0, 0]),
  },
  {
    id: 'open-g-sus4',
    label: 'Open Gsus4 form',
    root: 'G',
    quality: 'sus4',
    fretting: toFretting([3, 'x', 0, 0, 1, 3]),
  },
  {
    id: 'open-d7-sus4',
    label: 'Open D7sus4 form',
    root: 'D',
    quality: '7sus4',
    fretting: toFretting(['x', 'x', 0, 2, 1, 3]),
  },
  {
    id: 'open-a7-sus4',
    label: 'Open A7sus4 form',
    root: 'A',
    quality: '7sus4',
    fretting: toFretting(['x', 0, 2, 0, 3, 0]),
  },
  {
    id: 'open-em7-high-d',
    label: 'Em7',
    root: 'E',
    quality: 'm7',
    fretting: toFretting([0, 2, 2, 0, 3, 0]),
  },
  {
    id: 'open-g-high-d',
    label: 'G',
    root: 'G',
    quality: 'major',
    fretting: toFretting([3, 2, 0, 0, 3, 3]),
  },
  {
    id: 'compact-f-major',
    label: 'F',
    root: 'F',
    quality: 'major',
    fretting: toFretting(['x', 'x', 3, 2, 1, 1]),
  },
  {
    id: 'open-d-power',
    label: 'D5',
    root: 'D',
    quality: '5',
    fretting: toFretting(['x', 'x', 0, 2, 3, 'x']),
  },
  {
    id: 'open-g-over-b',
    label: 'G/B',
    root: 'G',
    quality: 'major',
    fretting: toFretting(['x', 2, 0, 0, 0, 3]),
  },
  {
    id: 'open-d-over-f-sharp',
    label: 'D/F#',
    root: 'D',
    quality: 'major',
    fretting: toFretting([2, 'x', 0, 2, 3, 2]),
  },
  {
    id: 'open-c-over-e',
    label: 'C/E',
    root: 'C',
    quality: 'major',
    fretting: toFretting([0, 3, 2, 0, 1, 0]),
  },
  {
    id: 'open-c-over-g',
    label: 'C/G',
    root: 'C',
    quality: 'major',
    fretting: toFretting([3, 3, 2, 0, 1, 0]),
  },
  {
    id: 'open-a-over-c-sharp',
    label: 'A/C#',
    root: 'A',
    quality: 'major',
    fretting: toFretting(['x', 4, 2, 2, 2, 0]),
  },
  {
    id: 'open-e-over-g-sharp',
    label: 'E/G#',
    root: 'E',
    quality: 'major',
    fretting: toFretting([4, 'x', 2, 1, 0, 0]),
  },
  {
    id: 'open-f-over-a',
    label: 'F/A',
    root: 'F',
    quality: 'major',
    fretting: toFretting(['x', 0, 3, 2, 1, 1]),
  },
  {
    id: 'open-am-over-e',
    label: 'Am/E',
    root: 'A',
    quality: 'minor',
    fretting: toFretting([0, 0, 2, 2, 1, 0]),
  },
  {
    id: 'open-em-add9',
    label: 'Emadd9',
    root: 'E',
    quality: 'madd9',
    fretting: toFretting([0, 2, 4, 0, 0, 0]),
  },
  {
    id: 'open-a-add9',
    label: 'Aadd9',
    root: 'A',
    quality: 'add9',
    fretting: toFretting(['x', 0, 2, 4, 2, 0]),
  },
  {
    id: 'open-f-over-g',
    label: 'F/G',
    root: 'F',
    quality: 'major',
    fretting: toFretting([3, 'x', 3, 2, 1, 1]),
  },
  {
    id: 'open-c-over-b',
    label: 'C/B',
    root: 'C',
    quality: 'major',
    fretting: toFretting(['x', 2, 2, 0, 1, 0]),
  },
  {
    id: 'open-am-over-g',
    label: 'Am/G',
    root: 'A',
    quality: 'minor',
    fretting: toFretting([3, 'x', 2, 2, 1, 0]),
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
    {
      id: 'upper-major',
      label: '4th-string form',
      rootStringIndex: 2,
      frets: ['x', 'x', 0, 2, 3, 2],
    },
    {
      id: 'upper-string-major',
      label: 'Upper-string triad',
      rootStringIndex: 3,
      frets: ['x', 'x', 'x', 0, 0, -2],
    },
    {
      id: 'major-first-inversion',
      label: 'First inversion',
      rootStringIndex: 3,
      frets: ['x', 2, 0, 0, 0, 'x'],
    },
    {
      id: 'major-second-inversion',
      label: 'Second inversion',
      rootStringIndex: 1,
      frets: [0, 0, 2, 2, 2, 'x'],
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
    {
      id: 'upper-minor',
      label: '4th-string form',
      rootStringIndex: 2,
      frets: ['x', 'x', 0, 2, 3, 1],
    },
    {
      id: 'upper-string-minor',
      label: 'Upper-string triad',
      rootStringIndex: 3,
      frets: ['x', 'x', 'x', 0, -1, -2],
    },
    {
      id: 'minor-first-inversion',
      label: 'First inversion',
      rootStringIndex: 3,
      frets: ['x', 1, 0, 0, 'x', 'x'],
    },
    {
      id: 'minor-second-inversion',
      label: 'Second inversion',
      rootStringIndex: 1,
      frets: [0, 0, 2, 2, 1, 'x'],
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
    {
      id: '6th-root-power-dyad',
      label: 'Two-string power chord',
      rootStringIndex: 0,
      frets: [0, 2, 'x', 'x', 'x', 'x'],
    },
    {
      id: '5th-root-power-dyad',
      label: 'Two-string power chord',
      rootStringIndex: 1,
      frets: ['x', 0, 2, 'x', 'x', 'x'],
    },
  ],
  sus2: [
    {
      id: '4th-root-sus2',
      label: '4th-string form',
      rootStringIndex: 2,
      frets: ['x', 'x', 0, 2, 3, 0],
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
    {
      id: '5th-root-dim',
      label: '5th-string triad',
      rootStringIndex: 1,
      frets: ['x', 0, 1, 2, 1, 'x'],
    },
    {
      id: '4th-root-dim',
      label: '4th-string triad',
      rootStringIndex: 2,
      frets: ['x', 'x', 0, 1, 3, 1],
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
    {
      id: 'shell-7',
      label: 'Shell (R, 3, b7)',
      rootStringIndex: 1,
      frets: ['x', 0, -1, 0, 'x', 'x'],
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
    {
      id: 'shell-maj7',
      label: 'Shell (R, 3, 7)',
      rootStringIndex: 1,
      frets: ['x', 0, -1, 1, 'x', 'x'],
    },
    {
      id: '6th-root-drop3-maj7',
      label: 'Drop 3',
      rootStringIndex: 0,
      frets: [0, 'x', 1, 1, 0, 'x'],
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
    {
      id: 'shell-m7',
      label: 'Shell (R, b3, b7)',
      rootStringIndex: 1,
      frets: ['x', 0, -2, 0, 'x', 'x'],
    },
    {
      id: '6th-root-drop3-m7',
      label: 'Drop 3',
      rootStringIndex: 0,
      frets: [0, 'x', 0, 0, 0, 'x'],
    },
  ],
  m7b5: [
    {
      id: '6th-root-m7b5',
      label: 'Half-diminished form',
      rootStringIndex: 0,
      frets: [0, 1, 0, 0, 'x', 'x'],
    },
    {
      id: '5th-root-half-dim',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 1, 0, 1, 'x'],
    },
  ],
  dim7: [
    {
      id: '6th-root-dim7',
      label: 'Diminished seventh form',
      rootStringIndex: 0,
      frets: [0, 1, 2, 0, 2, 'x'],
    },
    {
      id: '5th-root-dim7',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, 1, -1, 1, 'x'],
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
      id: '5th-root-compact-add9',
      label: '5th-string add9',
      rootStringIndex: 1,
      frets: ['x', 0, -1, -3, 0, 'x'],
    },
  ],
  maj9: [
    {
      id: '6th-root-maj9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 'x', 1, 1, 0, 2],
    },
    {
      id: '5th-root-maj9',
      label: '5th-string ninth',
      rootStringIndex: 1,
      frets: ['x', 0, -1, 1, 0, 'x'],
    },
  ],
  m9: [
    {
      id: '6th-root-m9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 'x', 0, 0, 0, 2],
    },
    {
      id: '5th-root-m9',
      label: '5th-string ninth',
      rootStringIndex: 1,
      frets: ['x', 0, -2, 0, 0, 'x'],
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
  madd9: [
    {
      id: '5th-root-madd9',
      label: '5th-string form',
      rootStringIndex: 1,
      frets: ['x', 0, -2, -3, 0, 'x'],
    },
  ],
  mMaj7: [
    {
      id: '6th-root-m-maj7',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 1, 0, 0, 0],
    },
  ],
  '6/9': [
    {
      id: '6th-root-6-9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 2, 1, 2, 2],
    },
    {
      id: '5th-root-69',
      label: '5th-string 6/9',
      rootStringIndex: 1,
      frets: ['x', 0, -1, -1, 0, 0],
    },
  ],
  '9': [
    {
      id: '6th-root-9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 0, 1, 0, 2],
    },
    {
      id: '5th-root-9',
      label: '5th-string ninth',
      rootStringIndex: 1,
      frets: ['x', 0, -1, 0, 0, 0],
    },
  ],
  '11': [
    {
      id: '5th-root-11',
      label: '5th-string eleventh',
      rootStringIndex: 1,
      frets: ['x', 0, 0, 0, 2, 'x'],
    },
  ],
  '13': [
    {
      id: '6th-root-13',
      label: '6th-string form (5 omitted)',
      rootStringIndex: 0,
      frets: [0, 'x', 0, 1, 2, 2],
    },
  ],
  m11: [
    {
      id: '5th-root-m11',
      label: '5th-string eleventh',
      rootStringIndex: 1,
      frets: ['x', 0, -2, 0, 0, -2],
    },
  ],
  '7b5': [
    {
      id: '6th-root-7b5',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 1, 0, 1, 'x', 'x'],
    },
  ],
  '7#5': [
    {
      id: '6th-root-7-sharp-5',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 3, 0, 1, 1, 'x'],
    },
  ],
  '7b9': [
    {
      id: '6th-root-7b9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 0, 1, 0, 1],
    },
    {
      id: '5th-root-7b9',
      label: '5th-string altered dominant',
      rootStringIndex: 1,
      frets: ['x', 0, -1, 0, -1, 'x'],
    },
  ],
  '7#9': [
    {
      id: '6th-root-7-sharp-9',
      label: '6th-string form',
      rootStringIndex: 0,
      frets: [0, 2, 0, 1, 3, 3],
    },
    {
      id: '5th-root-7sharp9',
      label: '5th-string altered dominant',
      rootStringIndex: 1,
      frets: ['x', 0, -1, 0, 1, 'x'],
    },
  ],
  '9sus4': [
    {
      id: '5th-root-9sus4',
      label: '5th-string suspended ninth',
      rootStringIndex: 1,
      frets: ['x', 0, 0, 0, 0, 0],
    },
  ],
  '7#11': [
    {
      id: '6th-root-7sharp11',
      label: '6th-string altered dominant',
      rootStringIndex: 0,
      frets: [0, 1, 0, 1, 0, 'x'],
    },
  ],
}

export const CHORD_QUALITIES = Object.keys(
  CHORD_INTERVALS,
) as readonly ChordQuality[]

export const BASIC_QUALITIES: readonly ChordQuality[] = [
  'major',
  'minor',
  '7',
  'm7',
  'maj7',
  '5',
  'sus4',
  'sus2',
  'add9',
]

// Keep pitch IDs stable in project files. Chord charts commonly mix flats and sharps.
const CHART_ROOT_NAMES: Partial<Record<PitchClassName, string>> = {
  'D#': 'Eb',
  'G#': 'Ab',
  'A#': 'Bb',
}

export function chartRootName(root: PitchClassName): string {
  return CHART_ROOT_NAMES[root] ?? root
}

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
            matchKind: 'exact' as const,
            omittedIntervals: [],
            score:
              CHORD_PRIORITY[quality] +
              (slashBass ? 64 : 0) +
              rootIndex * 0.25 +
              Math.max(0, relativeIntervals.length - 3) * 0.5,
          },
        ]
      })
    },
  )

  // A single bass note beneath a complete triad can be written as F/G or Am/G.
  const bass = analysis.bassNote
  if (
    bass &&
    analysis.uniquePitchClasses.length === 4 &&
    analysis.playedNotes.filter((note) => note.note === bass).length === 1
  ) {
    const upperNotes = analysis.uniquePitchClasses.filter(
      (pitch) => pitch !== pitchClassNameToValue(bass),
    )
    for (const pitch of upperNotes) {
      const intervals = relativeIntervalsForRoot(upperNotes, pitch)
      for (const quality of ['major', 'minor'] as const) {
        if (isSameIntervalSet(intervals, NORMALIZED_INTERVALS[quality])) {
          const root = pitchClassToName(pitch)
          matches.push({
            root,
            quality,
            bass,
            intervals,
            label: buildChordLabel(root, quality, bass),
            matchKind: 'exact',
            omittedIntervals: [],
            score: 32 + CHORD_PRIORITY[quality],
          })
        }
      }
    }
  }
  return toPublicCandidates(matches)
}

function detectOmissionCandidatesFromAnalysis(
  analysis: FrettingAnalysis,
): readonly ChordCandidate[] {
  if (analysis.uniquePitchClasses.length < 3) {
    return []
  }

  const exactKeys = new Set(
    detectChordCandidatesFromAnalysis(analysis).map(candidateToKey),
  )
  const candidates = analysis.uniquePitchClasses.flatMap<ScoredChordCandidate>(
    (rootPitchClass, rootIndex) =>
      CHORD_QUALITIES.flatMap((quality) => {
        const observed = relativeIntervalsForRoot(
          analysis.uniquePitchClasses,
          rootPitchClass,
        )
        const target = NORMALIZED_INTERVALS[quality]
        const optional = NORMALIZED_OPTIONAL_INTERVALS[quality]
        const required = target.filter(
          (interval) => !optional.includes(interval),
        )
        const omitted = target.filter(
          (interval) => !observed.includes(interval),
        )

        if (
          optional.length === 0 ||
          omitted.length === 0 ||
          !isSubset(observed, target) ||
          !isSubset(required, observed) ||
          !isSubset(omitted, optional)
        ) {
          return []
        }

        const root = pitchClassToName(rootPitchClass)
        const bass =
          analysis.bassNote && analysis.bassNote !== root
            ? analysis.bassNote
            : null
        const candidate: ScoredChordCandidate = {
          root,
          quality,
          bass,
          intervals: target,
          label: buildChordLabel(root, quality, bass),
          matchKind: 'omission',
          omittedIntervals: omitted,
          score:
            CHORD_PRIORITY[quality] + omitted.length * 4 + rootIndex * 0.25,
        }

        return exactKeys.has(candidateToKey(candidate)) ? [] : [candidate]
      }),
  )

  return toPublicCandidates(candidates)
}

function detectInferredCandidatesFromAnalysis(
  analysis: FrettingAnalysis,
): readonly ChordCandidate[] {
  if (analysis.uniquePitchClasses.length < 3) {
    return []
  }

  const regularKeys = new Set(
    [
      ...detectChordCandidatesFromAnalysis(analysis),
      ...detectOmissionCandidatesFromAnalysis(analysis),
    ].map(candidateToKey),
  )
  const candidates = PITCH_CLASSES.flatMap<ScoredChordCandidate>(
    (root, rootIndex) => {
      const rootPitchClass = pitchClassNameToValue(root)

      if (analysis.uniquePitchClasses.includes(rootPitchClass)) {
        return []
      }

      return CHORD_QUALITIES.flatMap((quality) => {
        const observed = relativeIntervalsForRoot(
          analysis.uniquePitchClasses,
          rootPitchClass,
        )
        const target = NORMALIZED_INTERVALS[quality]
        const optional = NORMALIZED_OPTIONAL_INTERVALS[quality]
        const requiredWithoutRoot = target.filter(
          (interval) => interval !== 0 && !optional.includes(interval),
        )
        const omitted = target.filter(
          (interval) => !observed.includes(interval),
        )

        if (
          requiredWithoutRoot.length < 3 ||
          !isSubset(observed, target) ||
          !isSubset(requiredWithoutRoot, observed)
        ) {
          return []
        }

        const bass = analysis.bassNote
        const candidate: ScoredChordCandidate = {
          root,
          quality,
          bass,
          intervals: target,
          label: buildChordLabel(root, quality, bass),
          matchKind: 'inferred',
          omittedIntervals: omitted,
          score:
            CHORD_PRIORITY[quality] + omitted.length * 5 + rootIndex * 0.25,
        }

        return regularKeys.has(candidateToKey(candidate)) ? [] : [candidate]
      })
    },
  )

  return toPublicCandidates(candidates)
}

function relativeIntervalsForRoot(
  pitchClasses: readonly number[],
  rootPitchClass: number,
): readonly number[] {
  return sortUniqueNumbers(
    pitchClasses.map((pitchClass) => mod12(pitchClass - rootPitchClass)),
  )
}

function isSubset(
  subset: readonly number[],
  superset: readonly number[],
): boolean {
  return subset.every((interval) => superset.includes(interval))
}

function candidateToKey(candidate: ChordCandidate): string {
  return `${candidate.root}:${candidate.quality}:${candidate.bass ?? ''}`
}

function toPublicCandidates(
  candidates: readonly ScoredChordCandidate[],
): readonly ChordCandidate[] {
  return [...candidates]
    .sort((left, right) => left.score - right.score)
    .map((candidate) => ({
      root: candidate.root,
      quality: candidate.quality,
      bass: candidate.bass,
      intervals: candidate.intervals,
      label: candidate.label,
      matchKind: candidate.matchKind,
      omittedIntervals: candidate.omittedIntervals,
    }))
}

export function derivePlayedNotes(fretting: Fretting): readonly PlayedNote[] {
  return analyzeFretting(fretting).playedNotes
}

export function deriveNoteNameAtPosition(
  stringIndex: number,
  fret: number,
): PitchClassName | null {
  const openPitch = STANDARD_TUNING_PITCHES[stringIndex]

  if (openPitch === undefined || fret < 0) {
    return null
  }

  return pitchClassToName(openPitch + fret)
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
  const rootName = chartRootName(root)
  const slash =
    bass && bass !== root ? `/${spellChordNote(root, quality, bass)}` : ''
  return `${rootName}${CHORD_SYMBOLS[quality]}${slash}`
}

// A chord degree fixes the letter as well as the pitch (e.g. G# in E/G#).
export function spellChordNote(
  root: PitchClassName,
  quality: ChordQuality,
  note: PitchClassName,
): string {
  const pitch = pitchClassNameToValue(note)
  const interval = CHORD_INTERVALS[quality].find(
    (value) => mod12(value) === mod12(pitch - pitchClassNameToValue(root)),
  )
  if (interval === undefined) return chartRootName(note)
  const label = getDegreeLabel(interval, quality)
  const degree = label === 'R' ? 1 : Number(label.replace(/[^0-9]/g, ''))
  const letters = 'CDEFGAB'
  const letter = letters[
    (letters.indexOf(chartRootName(root).charAt(0)) + degree - 1) % 7
  ] as PitchClassName
  const accidental = mod12(pitch - pitchClassNameToValue(letter) + 6) - 6
  return letter + (accidental < 0 ? 'b' : '#').repeat(Math.abs(accidental))
}

export function detectChordCandidates(
  fretting: Fretting,
): readonly ChordCandidate[] {
  const analysis = analyzeFretting(fretting)
  return [
    ...detectChordCandidatesFromAnalysis(analysis),
    ...detectOmissionCandidatesFromAnalysis(analysis),
  ]
}

export function summarizeChord(fretting: Fretting): ChordSummary {
  const analysis = analyzeFretting(fretting)
  const viewport = deriveViewport(fretting)
  const candidates = [
    ...detectChordCandidatesFromAnalysis(analysis),
    ...detectOmissionCandidatesFromAnalysis(analysis),
  ]
  const inferredCandidates = detectInferredCandidatesFromAnalysis(analysis)
  const currentCandidate = candidates[0]

  return {
    playedNotes: analysis.playedNotes,
    uniqueNotes: analysis.uniqueNotes,
    bassNote: analysis.bassNote,
    viewport,
    candidates,
    inferredCandidates,
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
      degreeLabelByInterval.get(interval) ??
      DEFAULT_DEGREE_LABELS[interval] ??
      null
    )
  })
}

export function getChordForms(
  root: PitchClassName,
  quality: ChordQuality,
  includeGenerated = false,
): readonly ChordForm[] {
  const absoluteForms = ABSOLUTE_FORM_LIBRARY.filter(
    (form) => form.root === root && form.quality === quality,
  ).map(({ id, label, fretting }) => ({
    id,
    label,
    fretting,
  }))

  const movableForms = RELATIVE_FORM_LIBRARY[quality].map((form) => {
    const fretting = buildRelativeForm(root, form)
    const bass = deriveBassNote(fretting)
    return {
      id: `${form.id}-${root}`,
      label: bass === root ? form.label : buildChordLabel(root, quality, bass),
      fretting,
    }
  })
  movableForms.sort((a, b) => highestFret(a) - highestFret(b))
  const registered = [...absoluteForms, ...movableForms]
  const rootPosition = registered.filter(
    (form) => deriveBassNote(form.fretting) === root,
  )
  const inversions = registered.filter(
    (form) => deriveBassNote(form.fretting) !== root,
  )
  const generatedForms = includeGenerated
    ? generateChordForms(root, quality)
    : []

  const deduped = new Map<string, ChordForm>()

  ;[...rootPosition, ...inversions, ...generatedForms].forEach((form) => {
    const key = frettingToKey(form.fretting)

    if (!deduped.has(key)) {
      deduped.set(key, form)
    }
  })

  return [...deduped.values()]
}

function highestFret(form: ChordForm): number {
  return Math.max(
    0,
    ...form.fretting.filter((fret) => typeof fret === 'number'),
  )
}

function generateChordForms(
  root: PitchClassName,
  quality: ChordQuality,
): readonly ChordForm[] {
  const cacheKey = `${root}:${quality}`
  const cachedForms = GENERATED_FORM_CACHE.get(cacheKey)

  if (cachedForms) {
    return cachedForms
  }

  const rootPitchClass = pitchClassNameToValue(root)
  const targetIntervals = NORMALIZED_INTERVALS[quality]
  const optionalIntervals = NORMALIZED_OPTIONAL_INTERVALS[quality]
  const requiredIntervals = targetIntervals.filter(
    (interval) => !optionalIntervals.includes(interval),
  )
  const candidates = new Map<string, ScoredChordForm>()

  for (
    let startFret = 1;
    startFret <= GENERATED_FORM_MAX_FRET;
    startFret += 1
  ) {
    const statesByString = STANDARD_TUNING_PITCHES.map(
      (openPitch): readonly StringState[] => {
        const states: StringState[] = ['x']

        if (
          startFret === 1 &&
          targetIntervals.includes(mod12(openPitch - rootPitchClass))
        ) {
          states.push(0)
        }

        for (
          let fret = startFret;
          fret <=
          Math.min(
            startFret + GENERATED_FORM_FRET_SPAN,
            GENERATED_FORM_MAX_FRET,
          );
          fret += 1
        ) {
          if (
            targetIntervals.includes(mod12(openPitch + fret - rootPitchClass))
          ) {
            states.push(fret)
          }
        }

        return states
      },
    )

    enumerateFrettings(statesByString, (fretting) => {
      const analysis = analyzeFretting(fretting)

      if (analysis.playedNotes.length < 3 || analysis.playedNotes.length > 4) {
        return
      }

      const observedIntervals = relativeIntervalsForRoot(
        analysis.uniquePitchClasses,
        rootPitchClass,
      )
      const omittedIntervals = targetIntervals.filter(
        (interval) => !observedIntervals.includes(interval),
      )

      if (
        !observedIntervals.includes(0) ||
        !isSubset(observedIntervals, targetIntervals) ||
        !isSubset(requiredIntervals, observedIntervals) ||
        !isSubset(omittedIntervals, optionalIntervals)
      ) {
        return
      }

      const frettedNotes = analysis.playedNotes.filter((note) => note.fret > 0)
      const frets = frettedNotes.map((note) => note.fret)
      const minFret = frets.length > 0 ? Math.min(...frets) : 0
      const maxFret = frets.length > 0 ? Math.max(...frets) : 0
      const span = maxFret - minFret
      const interiorMutedStrings = countInteriorMutedStrings(fretting)
      const bassPenalty = analysis.bassNote === root ? 0 : 5
      const score =
        omittedIntervals.length * 20 +
        bassPenalty +
        span * 2 +
        interiorMutedStrings * 2 +
        Math.abs(4 - analysis.playedNotes.length) +
        minFret * 0.1
      const key = frettingToKey(fretting)
      const previous = candidates.get(key)

      if (!previous || score < previous.score) {
        candidates.set(key, {
          id: `generated-${quality}-${root}-${key}`,
          label: '',
          fretting,
          score,
        })
      }
    })
  }

  const forms: ChordForm[] = []
  for (const form of [...candidates.values()].sort(
    (a, b) => a.score - b.score,
  )) {
    // A generated voicing should keep the requested name when placed on the chart.
    const match = detectChordCandidates(form.fretting)[0]
    if (match?.root !== root || match.quality !== quality) continue
    forms.push({
      id: form.id,
      label: `${match.label} · ${buildGeneratedFormLabel(form.fretting, forms.length)}`,
      fretting: form.fretting,
    })
    if (forms.length === MAX_GENERATED_FORM_COUNT) break
  }

  GENERATED_FORM_CACHE.set(cacheKey, forms)
  return forms
}

function enumerateFrettings(
  statesByString: readonly (readonly StringState[])[],
  visit: (fretting: Fretting) => void,
  stringIndex = 0,
  states: StringState[] = [],
): void {
  const availableStates = statesByString[stringIndex]

  if (!availableStates) {
    visit(toFretting([...states]))
    return
  }

  for (const state of availableStates) {
    states.push(state)
    enumerateFrettings(statesByString, visit, stringIndex + 1, states)
    states.pop()
  }
}

function countInteriorMutedStrings(fretting: Fretting): number {
  const playedIndexes = fretting.flatMap((state, index) =>
    state === 'x' ? [] : [index],
  )
  const firstPlayed = playedIndexes[0]
  const lastPlayed = playedIndexes[playedIndexes.length - 1]

  if (firstPlayed === undefined || lastPlayed === undefined) {
    return 0
  }

  return fretting
    .slice(firstPlayed, lastPlayed + 1)
    .filter((state) => state === 'x').length
}

function buildGeneratedFormLabel(fretting: Fretting, index: number): string {
  const frets = fretting.flatMap((state) =>
    typeof state === 'number' && state > 0 ? [state] : [],
  )
  if (frets.length === 0) return 'Open strings'
  const minFret = Math.min(...frets)
  const maxFret = Math.max(...frets)
  const fretLabel = minFret === maxFret ? `${minFret}` : `${minFret}-${maxFret}`

  return `Compact form ${index + 1} (frets ${fretLabel})`
}

function buildRelativeForm(
  root: PitchClassName,
  form: RelativeChordFormDefinition,
): Fretting {
  const anchorPitch = STANDARD_TUNING_PITCHES[form.rootStringIndex]
  const lowestOffset = Math.min(
    0,
    ...form.frets.filter((fret) => typeof fret === 'number'),
  )
  const rootFret =
    mod12(pitchClassNameToValue(root) - anchorPitch + lowestOffset) -
    lowestOffset

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

function createDegreeLabelByInterval(
  quality: ChordQuality,
): Map<number, string> {
  return CHORD_INTERVALS[quality].reduce((labels, interval) => {
    labels.set(mod12(interval), getDegreeLabel(interval, quality))
    return labels
  }, new Map<number, string>())
}

function getDegreeLabel(interval: number, quality: ChordQuality): string {
  if (quality === 'dim7' && interval === 9) return 'bb7'
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

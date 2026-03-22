import {
  CHORD_QUALITIES,
  PITCH_CLASSES,
  toFretting,
  type ChordQuality,
  type Fretting,
  type PitchClassName,
  type StringState,
} from '../music/chords'

const PROJECT_FILE_FORMAT = 'chordcanvas-project'
const PROJECT_FILE_VERSION = 1

export interface ChordBlockState {
  id: string
  fretting: Fretting
  xOffset: number
  spacing: number
  rowId: string
}

export interface LayoutRowState {
  id: string
  lyrics: string
}

export interface StockChordState {
  id: string
  fretting: Fretting
}

export interface ProjectSnapshot {
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  layoutRows: LayoutRowState[]
  stockChords: StockChordState[]
  blocks: ChordBlockState[]
  selectedBlockId: string
  selectedLayoutRowId: string
  manualStartFret: number
  manualFretCount: number
}

interface ProjectFileDocument {
  format: typeof PROJECT_FILE_FORMAT
  version: typeof PROJECT_FILE_VERSION
  exportedAt: string
  state: ProjectSnapshot
}

export function serializeProjectFile(snapshot: ProjectSnapshot): string {
  const document: ProjectFileDocument = {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    state: cloneProjectSnapshot(snapshot),
  }

  return JSON.stringify(document, null, 2)
}

export function parseProjectFile(text: string): ProjectSnapshot {
  let document: unknown

  try {
    document = JSON.parse(text)
  } catch {
    throw new Error('JSON の解析に失敗しました。')
  }

  if (!isRecord(document)) {
    throw new Error('project JSON の形式が不正です。')
  }

  if (document.format !== PROJECT_FILE_FORMAT) {
    throw new Error('ChordCanvas project JSON ではありません。')
  }

  if (document.version !== PROJECT_FILE_VERSION) {
    throw new Error('未対応の project version です。')
  }

  return parseProjectSnapshot(document.state)
}

export function cloneProjectSnapshot(
  snapshot: ProjectSnapshot,
): ProjectSnapshot {
  return {
    ...snapshot,
    layoutRows: snapshot.layoutRows.map((row) => ({ ...row })),
    stockChords: snapshot.stockChords.map((stockChord) => ({
      ...stockChord,
      fretting: toFretting([...stockChord.fretting]),
    })),
    blocks: snapshot.blocks.map((block) => ({
      ...block,
      fretting: toFretting([...block.fretting]),
    })),
  }
}

function parseProjectSnapshot(value: unknown): ProjectSnapshot {
  if (!isRecord(value)) {
    throw new Error('project state の形式が不正です。')
  }

  const layoutRows = parseLayoutRows(value.layoutRows)
  const stockChords = parseStockChords(value.stockChords)
  const blocks = parseBlocks(
    value.blocks,
    new Set(layoutRows.map((row) => row.id)),
  )
  const selectedBlockId = parseString(value.selectedBlockId, 'selectedBlockId')
  const selectedLayoutRowId = parseString(
    value.selectedLayoutRowId,
    'selectedLayoutRowId',
  )

  if (!blocks.some((block) => block.id === selectedBlockId)) {
    throw new Error('selectedBlockId が blocks に存在しません。')
  }

  if (!layoutRows.some((row) => row.id === selectedLayoutRowId)) {
    throw new Error('selectedLayoutRowId が layoutRows に存在しません。')
  }

  return {
    selectedRoot: parsePitchClassName(value.selectedRoot),
    selectedQuality: parseChordQuality(value.selectedQuality),
    selectedFormId: parseString(value.selectedFormId, 'selectedFormId'),
    layoutRows,
    stockChords,
    blocks,
    selectedBlockId,
    selectedLayoutRowId,
    manualStartFret: parsePositiveInteger(
      value.manualStartFret,
      'manualStartFret',
    ),
    manualFretCount: parsePositiveInteger(
      value.manualFretCount,
      'manualFretCount',
    ),
  }
}

function parseLayoutRows(value: unknown): LayoutRowState[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('layoutRows は 1 件以上必要です。')
  }

  return value.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`layoutRows[${index}] の形式が不正です。`)
    }

    return {
      id: parseString(row.id, `layoutRows[${index}].id`),
      lyrics: parseString(row.lyrics, `layoutRows[${index}].lyrics`),
    }
  })
}

function parseStockChords(value: unknown): StockChordState[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error('stockChords の形式が不正です。')
  }

  return value.map((stockChord, index) => {
    if (!isRecord(stockChord)) {
      throw new Error(`stockChords[${index}] の形式が不正です。`)
    }

    return {
      id: parseString(stockChord.id, `stockChords[${index}].id`),
      fretting: parseFretting(
        stockChord.fretting,
        `stockChords[${index}].fretting`,
      ),
    }
  })
}

function parseBlocks(
  value: unknown,
  rowIds: ReadonlySet<string>,
): ChordBlockState[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('blocks は 1 件以上必要です。')
  }

  return value.map((block, index) => {
    if (!isRecord(block)) {
      throw new Error(`blocks[${index}] の形式が不正です。`)
    }

    const rowId = parseString(block.rowId, `blocks[${index}].rowId`)

    if (!rowIds.has(rowId)) {
      throw new Error(`blocks[${index}] が存在しない rowId を参照しています。`)
    }

    return {
      id: parseString(block.id, `blocks[${index}].id`),
      fretting: parseFretting(block.fretting, `blocks[${index}].fretting`),
      xOffset: parseInteger(block.xOffset, `blocks[${index}].xOffset`),
      spacing: parseInteger(block.spacing, `blocks[${index}].spacing`),
      rowId,
    }
  })
}

function parsePitchClassName(value: unknown): PitchClassName {
  if (
    typeof value === 'string' &&
    PITCH_CLASSES.includes(value as PitchClassName)
  ) {
    return value as PitchClassName
  }

  throw new Error('selectedRoot が不正です。')
}

function parseChordQuality(value: unknown): ChordQuality {
  if (
    typeof value === 'string' &&
    CHORD_QUALITIES.includes(value as ChordQuality)
  ) {
    return value as ChordQuality
  }

  throw new Error('selectedQuality が不正です。')
}

function parseFretting(value: unknown, fieldName: string): Fretting {
  if (!Array.isArray(value) || value.length !== 6) {
    throw new Error(`${fieldName} は 6 弦分必要です。`)
  }

  const stringStates = value.map((state, index) =>
    parseStringState(state, `${fieldName}[${index}]`),
  )

  return toFretting(stringStates)
}

function parseStringState(value: unknown, fieldName: string): StringState {
  if (value === 'x') {
    return value
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }

  throw new Error(`${fieldName} が不正です。`)
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = parseInteger(value, fieldName)

  if (parsed < 1) {
    throw new Error(`${fieldName} は 1 以上である必要があります。`)
  }

  return parsed
}

function parseInteger(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  throw new Error(`${fieldName} は整数である必要があります。`)
}

function parseString(value: unknown, fieldName: string): string {
  if (typeof value === 'string') {
    return value
  }

  throw new Error(`${fieldName} は文字列である必要があります。`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

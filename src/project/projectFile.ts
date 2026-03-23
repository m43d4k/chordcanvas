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

export type ProjectFileErrorCode =
  | 'invalidJson'
  | 'invalidProjectDocument'
  | 'unsupportedProjectFormat'
  | 'unsupportedProjectVersion'
  | 'invalidProjectState'
  | 'layoutRowsRequired'
  | 'invalidStockChords'
  | 'blocksRequired'
  | 'missingSelectedBlock'
  | 'missingSelectedLayoutRow'
  | 'duplicateLayoutRowId'
  | 'duplicateStockChordId'
  | 'duplicateBlockId'
  | 'missingBlockRow'
  | 'invalidField'

interface ProjectFileErrorOptions {
  fieldName?: string
  id?: string
}

export class ProjectFileError extends Error {
  code: ProjectFileErrorCode
  fieldName?: string
  id?: string

  constructor(
    code: ProjectFileErrorCode,
    options: ProjectFileErrorOptions = {},
  ) {
    super(code)
    this.name = 'ProjectFileError'
    this.code = code
    this.fieldName = options.fieldName
    this.id = options.id
  }
}

export interface ChordBlockState {
  id: string
  fretting: Fretting
  displayName?: string
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
  displayName?: string
}

export interface ProjectSnapshot {
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  currentFretting: Fretting
  currentChordName: string
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
    throw new ProjectFileError('invalidJson')
  }

  if (!isRecord(document)) {
    throw new ProjectFileError('invalidProjectDocument')
  }

  if (document.format !== PROJECT_FILE_FORMAT) {
    throw new ProjectFileError('unsupportedProjectFormat')
  }

  if (document.version !== PROJECT_FILE_VERSION) {
    throw new ProjectFileError('unsupportedProjectVersion')
  }

  return parseProjectSnapshot(document.state)
}

export function cloneProjectSnapshot(
  snapshot: ProjectSnapshot,
): ProjectSnapshot {
  return {
    ...snapshot,
    currentFretting: toFretting([...snapshot.currentFretting]),
    layoutRows: snapshot.layoutRows.map((row) => ({ ...row })),
    stockChords: snapshot.stockChords.map((stockChord) => ({
      ...stockChord,
      displayName: stockChord.displayName,
      fretting: toFretting([...stockChord.fretting]),
    })),
    blocks: snapshot.blocks.map((block) => ({
      ...block,
      displayName: block.displayName,
      fretting: toFretting([...block.fretting]),
    })),
  }
}

function parseProjectSnapshot(value: unknown): ProjectSnapshot {
  if (!isRecord(value)) {
    throw new ProjectFileError('invalidProjectState')
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
    throw new ProjectFileError('missingSelectedBlock')
  }

  if (!layoutRows.some((row) => row.id === selectedLayoutRowId)) {
    throw new ProjectFileError('missingSelectedLayoutRow')
  }

  const currentFretting =
    value.currentFretting === undefined
      ? toFretting([
          ...(blocks.find((block) => block.id === selectedBlockId)?.fretting ??
            blocks[0]!.fretting),
        ])
      : parseFretting(value.currentFretting, 'currentFretting')

  return {
    selectedRoot: parsePitchClassName(value.selectedRoot),
    selectedQuality: parseChordQuality(value.selectedQuality),
    selectedFormId: parseString(value.selectedFormId, 'selectedFormId'),
    currentFretting,
    currentChordName:
      value.currentChordName === undefined
        ? ''
        : parseString(value.currentChordName, 'currentChordName'),
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
    throw new ProjectFileError('layoutRowsRequired')
  }

  const layoutRows = value.map((row, index) => {
    const entryFieldName = `layoutRows[${index}]`

    if (!isRecord(row)) {
      throw new ProjectFileError('invalidField', {
        fieldName: entryFieldName,
      })
    }

    return {
      id: parseString(row.id, `layoutRows[${index}].id`),
      lyrics: parseString(row.lyrics, `layoutRows[${index}].lyrics`),
    }
  })

  assertUniqueIds(layoutRows, 'layoutRows', 'duplicateLayoutRowId')

  return layoutRows
}

function parseStockChords(value: unknown): StockChordState[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ProjectFileError('invalidStockChords')
  }

  const stockChords = value.map((stockChord, index) => {
    const entryFieldName = `stockChords[${index}]`

    if (!isRecord(stockChord)) {
      throw new ProjectFileError('invalidField', {
        fieldName: entryFieldName,
      })
    }

    return {
      id: parseString(stockChord.id, `stockChords[${index}].id`),
      fretting: parseFretting(
        stockChord.fretting,
        `stockChords[${index}].fretting`,
      ),
      displayName: parseOptionalString(
        stockChord.displayName,
        `stockChords[${index}].displayName`,
      ),
    }
  })

  assertUniqueIds(stockChords, 'stockChords', 'duplicateStockChordId')

  return stockChords
}

function parseBlocks(
  value: unknown,
  rowIds: ReadonlySet<string>,
): ChordBlockState[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ProjectFileError('blocksRequired')
  }

  const blocks = value.map((block, index) => {
    const entryFieldName = `blocks[${index}]`

    if (!isRecord(block)) {
      throw new ProjectFileError('invalidField', {
        fieldName: entryFieldName,
      })
    }

    const rowId = parseString(block.rowId, `blocks[${index}].rowId`)

    if (!rowIds.has(rowId)) {
      throw new ProjectFileError('missingBlockRow', {
        fieldName: `blocks[${index}].rowId`,
      })
    }

    return {
      id: parseString(block.id, `blocks[${index}].id`),
      fretting: parseFretting(block.fretting, `blocks[${index}].fretting`),
      displayName: parseOptionalString(
        block.displayName,
        `blocks[${index}].displayName`,
      ),
      xOffset: parseInteger(block.xOffset, `blocks[${index}].xOffset`),
      spacing: parseInteger(block.spacing, `blocks[${index}].spacing`),
      rowId,
    }
  })

  assertUniqueIds(blocks, 'blocks', 'duplicateBlockId')

  return blocks
}

function parsePitchClassName(value: unknown): PitchClassName {
  if (
    typeof value === 'string' &&
    PITCH_CLASSES.includes(value as PitchClassName)
  ) {
    return value as PitchClassName
  }

  throw new ProjectFileError('invalidField', {
    fieldName: 'selectedRoot',
  })
}

function parseChordQuality(value: unknown): ChordQuality {
  if (
    typeof value === 'string' &&
    CHORD_QUALITIES.includes(value as ChordQuality)
  ) {
    return value as ChordQuality
  }

  throw new ProjectFileError('invalidField', {
    fieldName: 'selectedQuality',
  })
}

function parseFretting(value: unknown, fieldName: string): Fretting {
  if (!Array.isArray(value) || value.length !== 6) {
    throw new ProjectFileError('invalidField', {
      fieldName,
    })
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

  throw new ProjectFileError('invalidField', {
    fieldName,
  })
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = parseInteger(value, fieldName)

  if (parsed < 1) {
    throw new ProjectFileError('invalidField', {
      fieldName,
    })
  }

  return parsed
}

function parseInteger(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  throw new ProjectFileError('invalidField', {
    fieldName,
  })
}

function parseString(value: unknown, fieldName: string): string {
  if (typeof value === 'string') {
    return value
  }

  throw new ProjectFileError('invalidField', {
    fieldName,
  })
}

function parseOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  return parseString(value, fieldName)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function assertUniqueIds<T extends { id: string }>(
  items: readonly T[],
  collectionName: 'layoutRows' | 'stockChords' | 'blocks',
  code: 'duplicateLayoutRowId' | 'duplicateStockChordId' | 'duplicateBlockId',
) {
  const seenIds = new Set<string>()

  items.forEach((item, index) => {
    if (seenIds.has(item.id)) {
      throw new ProjectFileError(code, {
        fieldName: `${collectionName}[${index}].id`,
        id: item.id,
      })
    }

    seenIds.add(item.id)
  })
}

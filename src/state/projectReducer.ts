import {
  MINIMUM_DIAGRAM_FRET_COUNT,
  type ChordQuality,
  type Fretting,
  type PitchClassName,
  toFretting,
} from '../music/chords'
import {
  getInsertionIndexForRow,
  moveBlockWithinRow,
} from '../layout/layoutEntries'
import {
  cloneProjectSnapshot,
  type ChordBlockState,
  type ProjectSnapshot,
} from '../project/projectFile'

const MAX_MANUAL_FRET_COUNT = 12
const DEFAULT_SPACING = 6
const BLOCK_ID_PREFIX = 'chord-'
const ROW_ID_PREFIX = 'row-'
const STOCK_ID_PREFIX = 'stock-'

export interface ProjectDraft {
  chordName: string
  fretting: Fretting
  manualFretCount: number
  manualStartFret: number
  selectedFormId: string
  selectedQuality: ChordQuality
  selectedRoot: PitchClassName
}

export interface ProjectNextIds {
  block: number
  row: number
  stock: number
}

export interface ProjectState extends ProjectSnapshot {
  nextIds: ProjectNextIds
}

export type ProjectAction =
  | {
      type: 'activateBlock'
      blockId: string
    }
  | {
      type: 'addBlock'
      displayName?: string
      fretting: Fretting
      rowId: string
    }
  | {
      type: 'addLayoutRow'
    }
  | {
      type: 'addStockChord'
      displayName?: string
      fretting: Fretting
    }
  | {
      type: 'applySnapshot'
      snapshot: ProjectSnapshot
    }
  | {
      type: 'commitDraft'
      draft: ProjectDraft
    }
  | {
      type: 'deleteBlock'
      blockId: string
    }
  | {
      type: 'deleteLayoutRow'
      rowId: string
    }
  | {
      type: 'duplicateSelectedBlock'
    }
  | {
      type: 'moveSelectedBlock'
      direction: -1 | 1
    }
  | {
      type: 'removeStockChord'
      stockChordId: string
    }
  | {
      type: 'selectLayoutRow'
      rowId: string
    }
  | {
      type: 'updateBlock'
      blockId: string
      changes: Partial<
        Pick<ChordBlockState, 'displayName' | 'fretting' | 'rowId' | 'spacing' | 'xOffset'>
      >
    }
  | {
      type: 'updateLyrics'
      lyrics: string
      rowId: string
    }

function clampManualFretCount(value: number): number {
  return Math.min(
    MAX_MANUAL_FRET_COUNT,
    Math.max(MINIMUM_DIAGRAM_FRET_COUNT, value),
  )
}

function copyFretting(fretting: Fretting): Fretting {
  return toFretting([...fretting])
}

function getNextSequenceValue(
  ids: readonly string[],
  prefix: string,
  fallback = 1,
): number {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sequencePattern = new RegExp(`^${escapedPrefix}(\\d+)$`)
  let nextValue = fallback

  ids.forEach((id) => {
    const match = id.match(sequencePattern)

    if (!match) {
      return
    }

    const sequence = Number.parseInt(match[1] ?? '', 10)

    if (!Number.isNaN(sequence)) {
      nextValue = Math.max(nextValue, sequence + 1)
    }
  })

  return nextValue
}

function deriveNextIds(snapshot: ProjectSnapshot): ProjectNextIds {
  return {
    block: getNextSequenceValue(
      snapshot.blocks.map((block) => block.id),
      BLOCK_ID_PREFIX,
    ),
    row: getNextSequenceValue(
      snapshot.layoutRows.map((row) => row.id),
      ROW_ID_PREFIX,
    ),
    stock: getNextSequenceValue(
      snapshot.stockChords.map((stockChord) => stockChord.id),
      STOCK_ID_PREFIX,
    ),
  }
}

export function createProjectState(snapshot: ProjectSnapshot): ProjectState {
  const nextState = cloneProjectSnapshot(snapshot)

  return {
    ...nextState,
    manualFretCount: clampManualFretCount(nextState.manualFretCount),
    manualStartFret: Math.max(1, nextState.manualStartFret),
    nextIds: deriveNextIds(nextState),
  }
}

function createLayoutRow(state: ProjectState) {
  return {
    nextIds: {
      ...state.nextIds,
      row: state.nextIds.row + 1,
    },
    row: {
      id: `${ROW_ID_PREFIX}${state.nextIds.row}`,
      lyrics: '',
    },
  }
}

function createChordBlock(
  state: ProjectState,
  action: Extract<ProjectAction, { type: 'addBlock' }>,
) {
  return {
    block: {
      id: `${BLOCK_ID_PREFIX}${state.nextIds.block}`,
      fretting: copyFretting(action.fretting),
      displayName: action.displayName,
      xOffset: 0,
      spacing: DEFAULT_SPACING,
      rowId: action.rowId,
    },
    nextIds: {
      ...state.nextIds,
      block: state.nextIds.block + 1,
    },
  }
}

function createDuplicatedBlock(state: ProjectState, selectedIndex: number) {
  const selectedBlock = state.blocks[selectedIndex]

  if (!selectedBlock) {
    return null
  }

  return {
    block: {
      id: `${BLOCK_ID_PREFIX}${state.nextIds.block}`,
      displayName: selectedBlock.displayName,
      fretting: copyFretting(selectedBlock.fretting),
      xOffset: selectedBlock.xOffset,
      spacing: selectedBlock.spacing,
      rowId: selectedBlock.rowId,
    },
    nextIds: {
      ...state.nextIds,
      block: state.nextIds.block + 1,
    },
  }
}

function createStockChord(
  state: ProjectState,
  action: Extract<ProjectAction, { type: 'addStockChord' }>,
) {
  return {
    nextIds: {
      ...state.nextIds,
      stock: state.nextIds.stock + 1,
    },
    stockChord: {
      id: `${STOCK_ID_PREFIX}${state.nextIds.stock}`,
      displayName: action.displayName,
      fretting: copyFretting(action.fretting),
    },
  }
}

export function projectReducer(
  state: ProjectState,
  action: ProjectAction,
): ProjectState {
  switch (action.type) {
    case 'applySnapshot':
      return createProjectState(action.snapshot)

    case 'commitDraft':
      return {
        ...state,
        currentChordName: action.draft.chordName,
        currentFretting: copyFretting(action.draft.fretting),
        manualFretCount: clampManualFretCount(action.draft.manualFretCount),
        manualStartFret: Math.max(1, action.draft.manualStartFret),
        selectedFormId: action.draft.selectedFormId,
        selectedQuality: action.draft.selectedQuality,
        selectedRoot: action.draft.selectedRoot,
      }

    case 'activateBlock': {
      const block = state.blocks.find((entry) => entry.id === action.blockId)

      if (!block) {
        return state
      }

      return {
        ...state,
        selectedBlockId: block.id,
        selectedLayoutRowId: block.rowId,
      }
    }

    case 'selectLayoutRow':
      if (!state.layoutRows.some((row) => row.id === action.rowId)) {
        return state
      }

      return {
        ...state,
        selectedLayoutRowId: action.rowId,
      }

    case 'addLayoutRow':
      {
        const nextEntry = createLayoutRow(state)

        return {
          ...state,
          nextIds: nextEntry.nextIds,
          layoutRows: [...state.layoutRows, nextEntry.row],
          selectedLayoutRowId: nextEntry.row.id,
        }
      }

    case 'updateLyrics':
      return {
        ...state,
        layoutRows: state.layoutRows.map((row) =>
          row.id === action.rowId ? { ...row, lyrics: action.lyrics } : row,
        ),
      }

    case 'addBlock': {
      if (!state.layoutRows.some((row) => row.id === action.rowId)) {
        return state
      }

      const nextEntry = createChordBlock(state, action)
      const insertionIndex = getInsertionIndexForRow(
        state.blocks,
        state.layoutRows,
        action.rowId,
      )

      return {
        ...state,
        nextIds: nextEntry.nextIds,
        blocks: [
          ...state.blocks.slice(0, insertionIndex),
          nextEntry.block,
          ...state.blocks.slice(insertionIndex),
        ],
        selectedBlockId: nextEntry.block.id,
        selectedLayoutRowId: nextEntry.block.rowId,
      }
    }

    case 'updateBlock':
      return {
        ...state,
        blocks: state.blocks.map((block) =>
          block.id === action.blockId
            ? {
                ...block,
                ...action.changes,
                fretting: action.changes.fretting
                  ? copyFretting(action.changes.fretting)
                  : block.fretting,
              }
            : block,
        ),
      }

    case 'addStockChord':
      {
        const nextEntry = createStockChord(state, action)

        return {
          ...state,
          nextIds: nextEntry.nextIds,
          stockChords: [...state.stockChords, nextEntry.stockChord],
        }
      }

    case 'removeStockChord':
      return {
        ...state,
        stockChords: state.stockChords.filter(
          (stockChord) => stockChord.id !== action.stockChordId,
        ),
      }

    case 'duplicateSelectedBlock': {
      const selectedIndex = state.blocks.findIndex(
        (block) => block.id === state.selectedBlockId,
      )

      if (selectedIndex < 0) {
        return state
      }

      const nextEntry = createDuplicatedBlock(state, selectedIndex)

      if (!nextEntry) {
        return state
      }

      return {
        ...state,
        nextIds: nextEntry.nextIds,
        blocks: [
          ...state.blocks.slice(0, selectedIndex + 1),
          nextEntry.block,
          ...state.blocks.slice(selectedIndex + 1),
        ],
        selectedBlockId: nextEntry.block.id,
        selectedLayoutRowId: nextEntry.block.rowId,
      }
    }

    case 'deleteBlock': {
      if (state.blocks.length === 1) {
        return state
      }

      const blockIndex = state.blocks.findIndex(
        (block) => block.id === action.blockId,
      )

      if (blockIndex < 0) {
        return state
      }

      const nextBlocks = state.blocks.filter(
        (block) => block.id !== action.blockId,
      )

      if (action.blockId !== state.selectedBlockId) {
        return {
          ...state,
          blocks: nextBlocks,
        }
      }

      const fallbackIndex = Math.max(0, blockIndex - 1)
      const fallbackBlock = nextBlocks[fallbackIndex] ?? nextBlocks[0]

      if (!fallbackBlock) {
        return state
      }

      return {
        ...state,
        blocks: nextBlocks,
        selectedBlockId: fallbackBlock.id,
        selectedLayoutRowId: fallbackBlock.rowId,
      }
    }

    case 'moveSelectedBlock': {
      const selectedBlock = state.blocks.find(
        (block) => block.id === state.selectedBlockId,
      )

      if (!selectedBlock) {
        return state
      }

      return {
        ...state,
        blocks: moveBlockWithinRow(
          state.blocks,
          state.selectedBlockId,
          selectedBlock.rowId,
          action.direction,
        ),
      }
    }

    case 'deleteLayoutRow': {
      if (state.layoutRows.length === 1) {
        return state
      }

      const selectedRowIndex = state.layoutRows.findIndex(
        (row) => row.id === action.rowId,
      )
      const rowToRemove = state.layoutRows[selectedRowIndex]
      const fallbackRow =
        state.layoutRows[selectedRowIndex - 1] ??
        state.layoutRows[selectedRowIndex + 1]

      if (!rowToRemove || !fallbackRow) {
        return state
      }

      const selectedBlock = state.blocks.find(
        (block) => block.id === state.selectedBlockId,
      )
      const selectedBlockRowId = selectedBlock?.rowId ?? null

      return {
        ...state,
        blocks: state.blocks.map((block) =>
          block.rowId === rowToRemove.id
            ? {
                ...block,
                rowId: fallbackRow.id,
              }
            : block,
        ),
        layoutRows: state.layoutRows.filter((row) => row.id !== rowToRemove.id),
        selectedLayoutRowId:
          state.selectedLayoutRowId === rowToRemove.id ||
          selectedBlockRowId === rowToRemove.id
            ? fallbackRow.id
            : state.selectedLayoutRowId,
      }
    }

    default:
      return state
  }
}

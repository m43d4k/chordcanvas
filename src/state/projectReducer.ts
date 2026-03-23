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
  type LayoutRowState,
  type ProjectSnapshot,
  type StockChordState,
} from '../project/projectFile'

const MAX_MANUAL_FRET_COUNT = 12

export interface ProjectDraft {
  chordName: string
  fretting: Fretting
  manualFretCount: number
  manualStartFret: number
  selectedFormId: string
  selectedQuality: ChordQuality
  selectedRoot: PitchClassName
}

export type ProjectState = ProjectSnapshot

export type ProjectAction =
  | {
      type: 'activateBlock'
      blockId: string
    }
  | {
      type: 'addBlock'
      block: ChordBlockState
    }
  | {
      type: 'addLayoutRow'
      row: LayoutRowState
    }
  | {
      type: 'addStockChord'
      stockChord: StockChordState
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
      block: ChordBlockState
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
  return Math.min(MAX_MANUAL_FRET_COUNT, Math.max(MINIMUM_DIAGRAM_FRET_COUNT, value))
}

function copyFretting(fretting: Fretting): Fretting {
  return toFretting([...fretting])
}

function cloneState(state: ProjectSnapshot): ProjectState {
  const nextState = cloneProjectSnapshot(state)

  return {
    ...nextState,
    manualFretCount: clampManualFretCount(nextState.manualFretCount),
    manualStartFret: Math.max(1, nextState.manualStartFret),
  }
}

export function projectReducer(
  state: ProjectState,
  action: ProjectAction,
): ProjectState {
  switch (action.type) {
    case 'applySnapshot':
      return cloneState(action.snapshot)

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
      return {
        ...state,
        layoutRows: [...state.layoutRows, action.row],
        selectedLayoutRowId: action.row.id,
      }

    case 'updateLyrics':
      return {
        ...state,
        layoutRows: state.layoutRows.map((row) =>
          row.id === action.rowId ? { ...row, lyrics: action.lyrics } : row,
        ),
      }

    case 'addBlock': {
      const insertionIndex = getInsertionIndexForRow(
        state.blocks,
        state.layoutRows,
        action.block.rowId,
      )

      return {
        ...state,
        blocks: [
          ...state.blocks.slice(0, insertionIndex),
          action.block,
          ...state.blocks.slice(insertionIndex),
        ],
        selectedBlockId: action.block.id,
        selectedLayoutRowId: action.block.rowId,
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
      return {
        ...state,
        stockChords: [...state.stockChords, action.stockChord],
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

      return {
        ...state,
        blocks: [
          ...state.blocks.slice(0, selectedIndex + 1),
          action.block,
          ...state.blocks.slice(selectedIndex + 1),
        ],
        selectedBlockId: action.block.id,
        selectedLayoutRowId: action.block.rowId,
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

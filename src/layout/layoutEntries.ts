import type { ChordSummary } from '../music/chords'
import { summarizeChord } from '../music/chords'
import type {
  ChordBlockState,
  LayoutRowState,
} from '../project/projectFile'

export const LAYOUT_BLOCK_WIDTH = 152
export const LAYOUT_SLOT_WIDTH = LAYOUT_BLOCK_WIDTH
export const LAYOUT_STAGE_MIN_WIDTH = 640
export const LAYOUT_STAGE_PADDING_INLINE = 16
export const LAYOUT_ROW_PADDING_INLINE = 15.2
export const LAYOUT_ADD_BUTTON_WIDTH = 72

export interface LayoutEntry {
  block: ChordBlockState
  displayName: string
  hasFollowingBlock: boolean
  left: number
  minXOffset: number
  summary: ChordSummary
}

export interface LayoutRowEntry {
  addButtonLeft: number
  entries: LayoutEntry[]
  row: LayoutRowState
  stageWidth: number
}

export interface LayoutEntriesResult {
  rows: LayoutRowEntry[]
  stageWidth: number
}

export interface DraggedBlockLayout {
  nextSpacing: number
  nextXOffset: number
}

export interface DraggedBlockLayoutInput {
  clientX: number
  hasFollowingBlock: boolean
  minXOffset: number
  startClientX: number
  startSpacing: number
  startXOffset: number
}

function getDisplayName(summary: ChordSummary, displayName?: string): string {
  const normalizedDisplayName = displayName?.trim()
  return normalizedDisplayName ? normalizedDisplayName : summary.currentName
}

export function getRowBlockIndices(
  blocks: readonly ChordBlockState[],
  rowId: string,
): number[] {
  const indices: number[] = []

  blocks.forEach((block, index) => {
    if (block.rowId === rowId) {
      indices.push(index)
    }
  })

  return indices
}

export function getInsertionIndexForRow(
  blocks: readonly ChordBlockState[],
  layoutRows: readonly LayoutRowState[],
  rowId: string,
): number {
  const rowOrder = new Map(layoutRows.map((row, index) => [row.id, index]))
  const targetRowIndex = rowOrder.get(rowId)

  if (targetRowIndex === undefined) {
    return blocks.length
  }

  let insertionIndex = 0
  let hasPreviousBlock = false

  blocks.forEach((block, index) => {
    const blockRowIndex = rowOrder.get(block.rowId)

    if (blockRowIndex !== undefined && blockRowIndex <= targetRowIndex) {
      insertionIndex = index + 1
      hasPreviousBlock = true
    }
  })

  if (hasPreviousBlock) {
    return insertionIndex
  }

  const nextRowBlockIndex = blocks.findIndex((block) => {
    const blockRowIndex = rowOrder.get(block.rowId)
    return blockRowIndex !== undefined && blockRowIndex > targetRowIndex
  })

  return nextRowBlockIndex < 0 ? blocks.length : nextRowBlockIndex
}

export function moveBlockWithinRow(
  blocks: readonly ChordBlockState[],
  selectedBlockId: string,
  rowId: string,
  direction: -1 | 1,
): ChordBlockState[] {
  const currentIndex = blocks.findIndex((block) => block.id === selectedBlockId)

  if (currentIndex < 0) {
    return [...blocks]
  }

  const rowBlockIndices = getRowBlockIndices(blocks, rowId)
  const currentRowIndex = rowBlockIndices.findIndex(
    (index) => index === currentIndex,
  )
  const nextRowIndex = currentRowIndex + direction

  if (nextRowIndex < 0 || nextRowIndex >= rowBlockIndices.length) {
    return [...blocks]
  }

  const nextIndex = rowBlockIndices[nextRowIndex]

  if (nextIndex === undefined) {
    return [...blocks]
  }

  const nextBlocks = [...blocks]
  const currentBlock = nextBlocks[currentIndex]
  const swapBlock = nextBlocks[nextIndex]

  if (!currentBlock || !swapBlock) {
    return [...blocks]
  }

  nextBlocks[currentIndex] = swapBlock
  nextBlocks[nextIndex] = currentBlock

  return nextBlocks
}

export function calculateDraggedBlockLayout({
  clientX,
  hasFollowingBlock,
  minXOffset,
  startClientX,
  startSpacing,
  startXOffset,
}: DraggedBlockLayoutInput): DraggedBlockLayout {
  const deltaX = Math.round(clientX - startClientX)
  const appliedDeltaX =
    Math.max(minXOffset, startXOffset + deltaX) - startXOffset
  const nextXOffset = startXOffset + appliedDeltaX
  const nextSpacing = hasFollowingBlock
    ? appliedDeltaX > 0
      ? Math.max(0, startSpacing - appliedDeltaX)
      : startSpacing
    : startSpacing

  return {
    nextSpacing,
    nextXOffset,
  }
}

export function buildLayoutEntries(
  layoutRows: readonly LayoutRowState[],
  blocks: readonly ChordBlockState[],
  {
    rowPaddingInline = LAYOUT_ROW_PADDING_INLINE,
    stagePaddingInline = LAYOUT_STAGE_PADDING_INLINE,
  }: {
    rowPaddingInline?: number
    stagePaddingInline?: number
  } = {},
): LayoutEntriesResult {
  const rows = layoutRows.map((row) => {
    let cursor = stagePaddingInline
    let nextFlowLeft = stagePaddingInline
    let minLeft = 0
    const entries = blocks
      .filter((block) => block.rowId === row.id)
      .map((block) => {
        const summary = summarizeChord(block.fretting)
        const flowLeft = Math.max(cursor, nextFlowLeft)
        const minXOffset = minLeft - flowLeft
        const left = Math.max(minLeft, flowLeft + block.xOffset)

        minLeft = left + LAYOUT_BLOCK_WIDTH
        nextFlowLeft = minLeft + block.spacing
        cursor += LAYOUT_SLOT_WIDTH + block.spacing

        return {
          block,
          displayName: getDisplayName(summary, block.displayName),
          hasFollowingBlock: false,
          left,
          minXOffset,
          summary,
        }
      })

    entries.forEach((entry, index) => {
      entry.hasFollowingBlock = index < entries.length - 1
    })

    const addButtonLeft = Math.max(cursor, nextFlowLeft)
    const chordLayerWidth = Math.max(
      cursor,
      nextFlowLeft + LAYOUT_ADD_BUTTON_WIDTH,
    )
    const chordStageWidth =
      chordLayerWidth + rowPaddingInline * 2 + stagePaddingInline * 2
    const lyricStageWidth = Math.max(
      LAYOUT_STAGE_MIN_WIDTH,
      row.lyrics.length * 11 + 80,
    )

    return {
      addButtonLeft,
      entries,
      row,
      stageWidth: Math.max(chordStageWidth, lyricStageWidth),
    }
  })

  return {
    rows,
    stageWidth: rows.reduce(
      (maxWidth, rowEntry) => Math.max(maxWidth, rowEntry.stageWidth),
      LAYOUT_STAGE_MIN_WIDTH,
    ),
  }
}

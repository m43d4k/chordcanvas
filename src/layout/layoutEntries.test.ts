import { describe, expect, it } from 'vitest'
import { toFretting } from '../music/chords'
import type {
  ChordBlockState,
  LayoutRowState,
} from '../project/projectFile'
import {
  buildLayoutEntries,
  calculateDraggedBlockLayout,
  getInsertionIndexForRow,
  moveBlockWithinRow,
} from './layoutEntries'

function createRows(): LayoutRowState[] {
  return [
    { id: 'row-1', lyrics: '' },
    { id: 'row-2', lyrics: 'Bridge line' },
  ]
}

function createBlocks(): ChordBlockState[] {
  return [
    {
      id: 'chord-1',
      fretting: toFretting([0, 2, 2, 1, 0, 0]),
      rowId: 'row-1',
      spacing: 6,
      xOffset: 0,
    },
    {
      id: 'chord-2',
      fretting: toFretting(['x', 0, 2, 2, 1, 0]),
      rowId: 'row-1',
      spacing: 12,
      xOffset: 0,
    },
    {
      id: 'chord-3',
      fretting: toFretting(['x', 'x', 0, 2, 3, 1]),
      rowId: 'row-2',
      spacing: 18,
      xOffset: 5,
    },
  ]
}

describe('layoutEntries', () => {
  it('inserts a block after the last block in the target row', () => {
    expect(getInsertionIndexForRow(createBlocks(), createRows(), 'row-1')).toBe(
      2,
    )
    expect(getInsertionIndexForRow(createBlocks(), createRows(), 'row-2')).toBe(
      3,
    )
  })

  it('swaps the selected block with the next block within the same row', () => {
    const nextBlocks = moveBlockWithinRow(createBlocks(), 'chord-1', 'row-1', 1)

    expect(nextBlocks.map((block) => block.id)).toEqual([
      'chord-2',
      'chord-1',
      'chord-3',
    ])
  })

  it('derives next drag layout values from pointer movement', () => {
    expect(
      calculateDraggedBlockLayout({
        clientX: 320,
        hasFollowingBlock: true,
        minXOffset: -20,
        startClientX: 200,
        startSpacing: 36,
        startXOffset: 0,
      }),
    ).toEqual({
      nextSpacing: 0,
      nextXOffset: 120,
    })
  })

  it('builds row entries and stage width from layout blocks', () => {
    const entries = buildLayoutEntries(createRows(), createBlocks())

    expect(entries.rows[0]?.entries[0]?.left).toBe(16)
    expect(entries.rows[0]?.entries[1]?.left).toBe(174)
    expect(entries.rows[1]?.entries[0]?.left).toBe(21)
    expect(entries.stageWidth).toBeGreaterThanOrEqual(640)
  })
})

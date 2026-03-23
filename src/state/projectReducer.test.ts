import { describe, expect, it } from 'vitest'
import { toFretting } from '../music/chords'
import type { ProjectSnapshot } from '../project/projectFile'
import {
  createProjectState,
  projectReducer,
  type ProjectAction,
  type ProjectState,
} from './projectReducer'

function createProjectSnapshot(): ProjectSnapshot {
  return {
    selectedRoot: 'E',
    selectedQuality: 'major',
    selectedFormId: 'open-e-major',
    currentFretting: toFretting([0, 2, 2, 1, 0, 0]),
    currentChordName: 'Intro E',
    layoutRows: [
      { id: 'row-1', lyrics: 'Verse' },
      { id: 'row-2', lyrics: 'Bridge' },
    ],
    stockChords: [
      {
        id: 'stock-1',
        displayName: 'Open E',
        fretting: toFretting([0, 2, 2, 1, 0, 0]),
      },
    ],
    blocks: [
      {
        id: 'chord-1',
        displayName: 'Verse E',
        fretting: toFretting([0, 2, 2, 1, 0, 0]),
        xOffset: 0,
        spacing: 6,
        rowId: 'row-1',
      },
      {
        id: 'chord-2',
        displayName: 'Bridge F',
        fretting: toFretting(['x', 'x', 0, 2, 3, 1]),
        xOffset: 5,
        spacing: 12,
        rowId: 'row-2',
      },
    ],
    selectedBlockId: 'chord-2',
    selectedLayoutRowId: 'row-2',
    manualStartFret: 1,
    manualFretCount: 5,
  }
}

function createState(snapshot = createProjectSnapshot()): ProjectState {
  return createProjectState(snapshot)
}

function reduce(state: ProjectState, action: ProjectAction): ProjectState {
  return projectReducer(state, action)
}

describe('projectReducer', () => {
  it('applies an imported snapshot while preserving deep copies and deriving next ids', () => {
    const snapshot: ProjectSnapshot = {
      ...createProjectSnapshot(),
      layoutRows: [
        { id: 'row-12', lyrics: 'Verse' },
        { id: 'row-18', lyrics: 'Bridge' },
      ],
      stockChords: [
        {
          id: 'stock-9',
          displayName: 'Stock Am',
          fretting: toFretting(['x', 0, 2, 2, 1, 0]),
        },
      ],
      blocks: [
        {
          id: 'chord-40',
          displayName: 'Verse Am',
          fretting: toFretting(['x', 0, 2, 2, 1, 0]),
          xOffset: 12,
          spacing: 24,
          rowId: 'row-12',
        },
        {
          id: 'chord-41',
          displayName: 'Bridge F',
          fretting: toFretting(['x', 'x', 0, 2, 3, 1]),
          xOffset: 5,
          spacing: 48,
          rowId: 'row-18',
        },
      ],
      selectedBlockId: 'chord-41',
      selectedLayoutRowId: 'row-18',
    }
    const nextState = reduce(createState(), {
      type: 'applySnapshot',
      snapshot,
    })
    const { nextIds, ...nextSnapshot } = nextState

    expect(nextSnapshot).toEqual(snapshot)
    expect(nextState).not.toBe(snapshot)
    expect(nextState.blocks).not.toBe(snapshot.blocks)
    expect(nextIds).toEqual({
      block: 42,
      row: 19,
      stock: 10,
    })
  })

  it('allocates new row, block, and stock ids without reusing deleted ids', () => {
    let nextState = reduce(createState(), {
      type: 'addLayoutRow',
    })

    expect(nextState.layoutRows.at(-1)?.id).toBe('row-3')

    nextState = reduce(nextState, {
      type: 'deleteLayoutRow',
      rowId: 'row-3',
    })
    nextState = reduce(nextState, {
      type: 'addLayoutRow',
    })

    expect(nextState.layoutRows.at(-1)?.id).toBe('row-4')

    nextState = reduce(nextState, {
      type: 'addStockChord',
      displayName: 'Open A',
      fretting: toFretting(['x', 0, 2, 2, 2, 0]),
    })

    expect(nextState.stockChords.at(-1)?.id).toBe('stock-2')

    nextState = reduce(nextState, {
      type: 'removeStockChord',
      stockChordId: 'stock-2',
    })
    nextState = reduce(nextState, {
      type: 'addStockChord',
      displayName: 'Open D',
      fretting: toFretting(['x', 'x', 0, 2, 3, 2]),
    })

    expect(nextState.stockChords.at(-1)?.id).toBe('stock-3')

    nextState = reduce(nextState, {
      type: 'addBlock',
      displayName: 'Verse A',
      fretting: toFretting(['x', 0, 2, 2, 2, 0]),
      rowId: 'row-1',
    })

    expect(nextState.selectedBlockId).toBe('chord-3')

    nextState = reduce(nextState, {
      type: 'deleteBlock',
      blockId: 'chord-3',
    })
    nextState = reduce(nextState, {
      type: 'addBlock',
      displayName: 'Verse D',
      fretting: toFretting(['x', 'x', 0, 2, 3, 2]),
      rowId: 'row-1',
    })

    expect(nextState.selectedBlockId).toBe('chord-4')
  })

  it('duplicates the selected block using reducer-managed ids', () => {
    const nextState = reduce(createState(), {
      type: 'duplicateSelectedBlock',
    })

    expect(nextState.selectedBlockId).toBe('chord-3')
    expect(nextState.blocks.at(-1)).toMatchObject({
      id: 'chord-3',
      displayName: 'Bridge F',
      rowId: 'row-2',
      spacing: 12,
      xOffset: 5,
    })
  })

  it('deletes a layout row and moves its blocks to an adjacent row', () => {
    const nextState = reduce(createState(), {
      type: 'deleteLayoutRow',
      rowId: 'row-2',
    })

    expect(nextState.layoutRows.map((row) => row.id)).toEqual(['row-1'])
    expect(nextState.blocks.map((block) => block.rowId)).toEqual([
      'row-1',
      'row-1',
    ])
    expect(nextState.selectedLayoutRowId).toBe('row-1')
  })

  it('moves the selected block only within its own row', () => {
    const nextState = reduce(
      createProjectState({
        ...createProjectSnapshot(),
        blocks: [
          {
            id: 'chord-1',
            displayName: 'Verse E',
            fretting: toFretting([0, 2, 2, 1, 0, 0]),
            xOffset: 0,
            spacing: 6,
            rowId: 'row-1',
          },
          {
            id: 'chord-3',
            displayName: 'Verse A',
            fretting: toFretting(['x', 0, 2, 2, 2, 0]),
            xOffset: 0,
            spacing: 6,
            rowId: 'row-1',
          },
          {
            id: 'chord-2',
            displayName: 'Bridge F',
            fretting: toFretting(['x', 'x', 0, 2, 3, 1]),
            xOffset: 5,
            spacing: 12,
            rowId: 'row-2',
          },
        ],
        selectedBlockId: 'chord-1',
        selectedLayoutRowId: 'row-1',
      }),
      {
        type: 'moveSelectedBlock',
        direction: 1,
      },
    )

    expect(nextState.blocks.map((block) => block.id)).toEqual([
      'chord-3',
      'chord-1',
      'chord-2',
    ])
  })
})

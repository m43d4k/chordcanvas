import { describe, expect, it } from 'vitest'
import { toFretting } from '../music/chords'
import {
  projectReducer,
  type ProjectAction,
  type ProjectState,
} from './projectReducer'

function createProjectState(): ProjectState {
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

function reduce(state: ProjectState, action: ProjectAction): ProjectState {
  return projectReducer(state, action)
}

describe('projectReducer', () => {
  it('applies an imported snapshot while preserving deep copies', () => {
    const snapshot = createProjectState()
    const nextState = reduce(createProjectState(), {
      type: 'applySnapshot',
      snapshot,
    })

    expect(nextState).toEqual(snapshot)
    expect(nextState).not.toBe(snapshot)
    expect(nextState.blocks).not.toBe(snapshot.blocks)
  })

  it('deletes a layout row and moves its blocks to an adjacent row', () => {
    const nextState = reduce(createProjectState(), {
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
      {
        ...createProjectState(),
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
      },
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

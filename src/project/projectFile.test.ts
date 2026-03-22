import { describe, expect, it } from 'vitest'
import { toFretting } from '../music/chords'
import {
  parseProjectFile,
  serializeProjectFile,
  type ProjectSnapshot,
} from './projectFile'

function createProjectSnapshot(): ProjectSnapshot {
  return {
    selectedRoot: 'E',
    selectedQuality: 'major',
    selectedFormId: 'open-e-major',
    layoutRows: [{ id: 'row-1', lyrics: 'Intro line' }],
    stockChords: [
      {
        id: 'stock-1',
        fretting: toFretting([0, 2, 2, 1, 0, 0]),
      },
    ],
    blocks: [
      {
        id: 'chord-1',
        fretting: toFretting([0, 2, 2, 1, 0, 0]),
        xOffset: 0,
        spacing: 36,
        rowId: 'row-1',
      },
    ],
    selectedBlockId: 'chord-1',
    selectedLayoutRowId: 'row-1',
    manualStartFret: 1,
    manualFretCount: 4,
  }
}

describe('projectFile', () => {
  it('round-trips a project snapshot through JSON', () => {
    const snapshot = createProjectSnapshot()

    expect(parseProjectFile(serializeProjectFile(snapshot))).toEqual(snapshot)
  })

  it('rejects blocks that point to missing rows', () => {
    const invalidDocument = JSON.stringify({
      format: 'chordcanvas-project',
      version: 1,
      exportedAt: '2026-03-22T00:00:00.000Z',
      state: {
        ...createProjectSnapshot(),
        blocks: [
          {
            id: 'chord-1',
            fretting: [0, 2, 2, 1, 0, 0],
            xOffset: 0,
            spacing: 36,
            rowId: 'row-99',
          },
        ],
      },
    })

    expect(() => parseProjectFile(invalidDocument)).toThrow(
      'blocks[0] が存在しない rowId を参照しています。',
    )
  })

  it('treats missing stockChords as an empty array when importing', () => {
    const snapshot = createProjectSnapshot()
    const { stockChords, ...legacySnapshot } = snapshot
    const legacyDocument = JSON.stringify({
      format: 'chordcanvas-project',
      version: 1,
      exportedAt: '2026-03-22T00:00:00.000Z',
      state: legacySnapshot,
    })

    expect(stockChords).toHaveLength(1)
    expect(parseProjectFile(legacyDocument).stockChords).toEqual([])
  })
})

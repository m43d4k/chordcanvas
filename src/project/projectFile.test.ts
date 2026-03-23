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
    currentFretting: toFretting([0, 2, 2, 1, 0, 0]),
    currentChordName: 'Session E',
    layoutRows: [{ id: 'row-1', lyrics: 'Intro line' }],
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
        displayName: 'Intro E',
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

    expect(() => parseProjectFile(invalidDocument)).toThrowError(
      expect.objectContaining({
        code: 'missingBlockRow',
        fieldName: 'blocks[0].rowId',
      }),
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

  it('falls back to the selected block fretting when currentFretting is missing', () => {
    const snapshot = createProjectSnapshot()
    const { currentFretting, ...legacySnapshot } = snapshot
    const legacyDocument = JSON.stringify({
      format: 'chordcanvas-project',
      version: 1,
      exportedAt: '2026-03-22T00:00:00.000Z',
      state: legacySnapshot,
    })

    expect(currentFretting).toEqual(toFretting([0, 2, 2, 1, 0, 0]))
    expect(parseProjectFile(legacyDocument).currentFretting).toEqual(
      snapshot.blocks[0]!.fretting,
    )
  })

  it('treats missing currentChordName as an empty string when importing', () => {
    const snapshot = createProjectSnapshot()
    const { currentChordName, ...legacySnapshot } = snapshot
    const legacyDocument = JSON.stringify({
      format: 'chordcanvas-project',
      version: 1,
      exportedAt: '2026-03-22T00:00:00.000Z',
      state: legacySnapshot,
    })

    expect(currentChordName).toBe('Session E')
    expect(parseProjectFile(legacyDocument).currentChordName).toBe('')
  })

  it('rejects duplicate layout row ids', () => {
    const snapshot = createProjectSnapshot()
    const invalidDocument = JSON.stringify({
      format: 'chordcanvas-project',
      version: 1,
      exportedAt: '2026-03-22T00:00:00.000Z',
      state: {
        ...snapshot,
        layoutRows: [
          { id: 'row-1', lyrics: 'Intro line' },
          { id: 'row-1', lyrics: 'Verse line' },
        ],
      },
    })

    expect(() => parseProjectFile(invalidDocument)).toThrowError(
      expect.objectContaining({
        code: 'duplicateLayoutRowId',
        fieldName: 'layoutRows[1].id',
        id: 'row-1',
      }),
    )
  })

  it('rejects duplicate stock chord ids', () => {
    const snapshot = createProjectSnapshot()
    const invalidDocument = JSON.stringify({
      format: 'chordcanvas-project',
      version: 1,
      exportedAt: '2026-03-22T00:00:00.000Z',
      state: {
        ...snapshot,
        stockChords: [
          {
            id: 'stock-1',
            displayName: 'Open E',
            fretting: [0, 2, 2, 1, 0, 0],
          },
          {
            id: 'stock-1',
            displayName: 'Second E',
            fretting: [0, 2, 2, 1, 0, 0],
          },
        ],
      },
    })

    expect(() => parseProjectFile(invalidDocument)).toThrowError(
      expect.objectContaining({
        code: 'duplicateStockChordId',
        fieldName: 'stockChords[1].id',
        id: 'stock-1',
      }),
    )
  })

  it('rejects duplicate block ids', () => {
    const snapshot = createProjectSnapshot()
    const invalidDocument = JSON.stringify({
      format: 'chordcanvas-project',
      version: 1,
      exportedAt: '2026-03-22T00:00:00.000Z',
      state: {
        ...snapshot,
        blocks: [
          {
            id: 'chord-1',
            displayName: 'Intro E',
            fretting: [0, 2, 2, 1, 0, 0],
            xOffset: 0,
            spacing: 36,
            rowId: 'row-1',
          },
          {
            id: 'chord-1',
            displayName: 'Verse E',
            fretting: [0, 2, 2, 1, 0, 0],
            xOffset: 12,
            spacing: 24,
            rowId: 'row-1',
          },
        ],
        selectedBlockId: 'chord-1',
      },
    })

    expect(() => parseProjectFile(invalidDocument)).toThrowError(
      expect.objectContaining({
        code: 'duplicateBlockId',
        fieldName: 'blocks[1].id',
        id: 'chord-1',
      }),
    )
  })
})

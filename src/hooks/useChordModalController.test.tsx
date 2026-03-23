import { act, renderHook } from '@testing-library/react'
import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { toFretting } from '../music/chords'
import type {
  ChordBlockState,
  LayoutRowState,
  StockChordState,
} from '../project/projectFile'
import {
  useChordModalController,
  type UseChordModalControllerOptions,
} from './useChordModalController'

function createSubmitEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>
}

function createOptions(
  overrides: Partial<UseChordModalControllerOptions> = {},
): UseChordModalControllerOptions {
  const blocks: readonly ChordBlockState[] = [
    {
      id: 'chord-1',
      displayName: 'Verse E',
      fretting: toFretting([0, 2, 2, 1, 0, 0]),
      rowId: 'row-1',
      spacing: 6,
      xOffset: 0,
    },
    {
      id: 'chord-2',
      displayName: 'Barre A',
      fretting: toFretting([5, 7, 7, 6, 5, 5]),
      rowId: 'row-2',
      spacing: 12,
      xOffset: 8,
    },
  ]
  const layoutRows: readonly LayoutRowState[] = [
    { id: 'row-1', lyrics: 'Verse' },
    { id: 'row-2', lyrics: 'Bridge' },
  ]
  const stockChords: readonly StockChordState[] = [
    {
      id: 'stock-1',
      displayName: 'Open E',
      fretting: toFretting([0, 2, 2, 1, 0, 0]),
    },
  ]

  return {
    blocks,
    currentDraftSource: {
      currentChordName: 'Intro E',
      currentFretting: toFretting([0, 2, 2, 1, 0, 0]),
      manualFretCount: 5,
      manualStartFret: 1,
      selectedFormId: 'open-e-major',
      selectedQuality: 'major',
      selectedRoot: 'E',
    },
    layoutRows,
    onAddLayoutBlockFromDraft: vi.fn(),
    onAddStockChordFromDraft: vi.fn(() => true),
    onAddStockChordToLayout: vi.fn(),
    onSelectLayoutRow: vi.fn(),
    onUpdateBlockFromDraft: vi.fn(),
    stockChords,
    ...overrides,
  }
}

describe('useChordModalController', () => {
  it('opens a layout modal with the current draft and selected row', () => {
    const options = createOptions()
    const { result } = renderHook(() => useChordModalController(options))

    act(() => {
      result.current.openLayoutChordModal('row-2')
    })

    expect(options.onSelectLayoutRow).toHaveBeenCalledWith('row-2')
    expect(result.current.chordModal).toMatchObject({
      kind: 'layout',
      targetRowId: 'row-2',
    })
    expect(result.current.modalDraft).toMatchObject({
      chordName: 'Intro E',
      selectedFormId: 'open-e-major',
      selectedQuality: 'major',
      selectedRoot: 'E',
    })
  })

  it('creates an edit draft from the selected block viewport', () => {
    const options = createOptions()
    const { result } = renderHook(() => useChordModalController(options))

    act(() => {
      result.current.openEditChordModal('chord-2')
    })

    expect(result.current.chordModal).toMatchObject({
      blockId: 'chord-2',
      kind: 'edit',
    })
    expect(result.current.modalDraft).toMatchObject({
      chordName: 'Barre A',
      manualStartFret: 5,
    })
  })

  it('submits a layout modal through the layout callback and closes the modal', () => {
    const options = createOptions()
    const { result } = renderHook(() => useChordModalController(options))

    act(() => {
      result.current.openLayoutChordModal('row-2')
    })

    const submitEvent = createSubmitEvent()

    act(() => {
      result.current.handleSubmitChordModal(submitEvent)
    })

    expect(submitEvent.preventDefault).toHaveBeenCalledTimes(1)
    expect(options.onAddLayoutBlockFromDraft).toHaveBeenCalledWith(
      'row-2',
      expect.objectContaining({
        chordName: 'Intro E',
      }),
    )
    expect(result.current.chordModal).toBeNull()
  })

  it('keeps the stock modal open when adding to stock is rejected', () => {
    const options = createOptions({
      onAddStockChordFromDraft: vi.fn(() => false),
    })
    const { result } = renderHook(() => useChordModalController(options))

    act(() => {
      result.current.openStockChordModal()
    })

    const submitEvent = createSubmitEvent()

    act(() => {
      result.current.handleSubmitChordModal(submitEvent)
    })

    expect(options.onAddStockChordFromDraft).toHaveBeenCalledTimes(1)
    expect(result.current.chordModal).toMatchObject({
      kind: 'stock',
    })
  })

  it('submits an edit modal through the update callback and closes the modal', () => {
    const options = createOptions()
    const { result } = renderHook(() => useChordModalController(options))

    act(() => {
      result.current.openEditChordModal('chord-2')
    })

    const submitEvent = createSubmitEvent()

    act(() => {
      result.current.handleSubmitChordModal(submitEvent)
    })

    expect(options.onUpdateBlockFromDraft).toHaveBeenCalledWith(
      'chord-2',
      expect.objectContaining({
        chordName: 'Barre A',
      }),
    )
    expect(result.current.chordModal).toBeNull()
  })
})

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pdfMocks = vi.hoisted(() => {
  const html2canvas = vi.fn()
  const pdfInstances: Array<{
    addImage: ReturnType<typeof vi.fn>
    addPage: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
    setDocumentProperties: ReturnType<typeof vi.fn>
  }> = []
  const jsPDF = vi.fn(function JsPdfMock(options?: { orientation?: string }) {
    const isPortrait = options?.orientation === 'portrait'
    const instance = {
      addImage: vi.fn(),
      addPage: vi.fn(),
      internal: {
        pageSize: {
          getHeight: () => (isPortrait ? 841.89 : 595.28),
          getWidth: () => (isPortrait ? 595.28 : 841.89),
        },
      },
      save: vi.fn().mockResolvedValue(undefined),
      setDocumentProperties: vi.fn(),
    }

    pdfInstances.push(instance)
    return instance
  })

  return {
    html2canvas,
    jsPDF,
    pdfInstances,
  }
})

vi.mock('html2canvas', () => ({
  default: pdfMocks.html2canvas,
}))

vi.mock('jspdf', () => ({
  jsPDF: pdfMocks.jsPDF,
}))

import App from './App'
import './index.css'
import { toFretting } from './music/chords'
import {
  serializeProjectFile,
  type ProjectSnapshot,
} from './project/projectFile'

afterEach(() => {
  cleanup()
  pdfMocks.html2canvas.mockReset()
  pdfMocks.jsPDF.mockClear()
  pdfMocks.pdfInstances.length = 0
})

function getItemOrThrow<T>(items: readonly T[], index: number): T {
  const item = items[index]

  if (item === undefined) {
    throw new Error(`Expected item at index ${index}`)
  }

  return item
}

function getLyricsLineButton(index: number): HTMLElement {
  const lineLabel = new RegExp(`^(歌詞 ${index} 行|Lyrics line ${index})$`)

  return screen.getByRole('button', {
    name: lineLabel,
  })
}

function openLyricsLineInput(index: number): HTMLInputElement {
  fireEvent.click(getLyricsLineButton(index))

  return screen.getByLabelText(
    new RegExp(`^(歌詞 ${index} 行|Lyrics line ${index})$`),
  ) as HTMLInputElement
}

function getLayoutBlocks(): HTMLElement[] {
  return screen.getAllByRole('button', {
    name: /^Select .* block$/,
  })
}

function dragLayoutBlock(
  block: HTMLElement,
  startClientX: number,
  endClientX: number,
  pointerId = 1,
) {
  fireEvent.pointerDown(block, {
    button: 0,
    clientX: startClientX,
    pointerId,
  })
  fireEvent.pointerMove(window, {
    clientX: endClientX,
    pointerId,
  })
  fireEvent.pointerUp(window, {
    clientX: endClientX,
    pointerId,
  })
}

function getLayoutRow(index: number): HTMLElement {
  return screen.getByRole('region', {
    name: new RegExp(`^(${index}行目|Row ${index})$`),
  })
}

function getLayoutAddButton(index: number): HTMLElement {
  return within(getLayoutRow(index)).getByRole('button', {
    name: new RegExp(`^(${index}行目 にコードを追加|Add chord to Row ${index})$`),
  })
}

function getOpenStockModalButton(): HTMLElement {
  return screen.getByRole('button', {
    name: /^(ストックにコードを追加|Add chord to stock)$/i,
  })
}

function getModalActions(dialog: HTMLElement): HTMLElement {
  const actions = dialog.querySelector('.modal-actions')

  if (!(actions instanceof HTMLElement)) {
    throw new Error('Expected modal actions')
  }

  return actions
}

function openStockModal(): HTMLElement {
  fireEvent.click(getOpenStockModalButton())

  return screen.getByRole('dialog', {
    name: /^(ストック用コードを追加|Add Chord to Stock)$/,
  })
}

function openLayoutAddModal(index: number): HTMLElement {
  fireEvent.click(getLayoutAddButton(index))

  return screen.getByRole('dialog', {
    name: new RegExp(`^(${index}行目 にコードを追加|Add Chord to Row ${index})$`),
  })
}

function openEditModal(): HTMLElement {
  fireEvent.click(
    screen.getByRole('button', {
      name: /^(編集|Edit)$/,
    }),
  )

  return screen.getByRole('dialog', {
    name: /^(コードブロックを編集|Edit Chord Block)$/,
  })
}

function submitModal(dialog: HTMLElement, name: RegExp | string) {
  fireEvent.click(
    within(getModalActions(dialog)).getByRole('button', {
      name,
    }),
  )
}

function addChordBlockToRow(index: number) {
  const dialog = openLayoutAddModal(index)
  submitModal(
    dialog,
    new RegExp(`^(${index}行目 に追加|Add to Row ${index})$`),
  )
}

function addCurrentChordToStock() {
  const dialog = openStockModal()
  submitModal(dialog, /^(ストックに追加|Add to Stock)$/)
}

describe('App', () => {
  it('renders stock and layout panels while keeping the chord builder hidden', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /ChordCanvas/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'コードストック',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'レイアウト編集',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'コード生成',
      }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', {
        name: 'コードダイアグラム編集',
      }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', {
        name: 'コード情報',
      }),
    ).toBeNull()
    expect(getOpenStockModalButton()).toBeInTheDocument()
    expect(getLayoutAddButton(1)).toBeInTheDocument()
  })

  it('switches visible UI copy to English inside the modal', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'English',
      }),
    )

    const dialog = openStockModal()

    expect(
      within(dialog).getByRole('heading', {
        name: 'Chord Generator',
      }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('heading', {
        name: 'Chord Diagram Editor',
      }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('heading', {
        name: 'Chord Info',
      }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', {
        name: 'Add to Stock',
      }),
    ).toBeInTheDocument()
    expect(
      getLayoutAddButton(1),
    ).toHaveAccessibleName('Add chord to Row 1')
  })

  it('shows a localized placeholder hint for empty lyrics lines', () => {
    render(<App />)

    expect(
      screen.getByText('歌詞を入力。スペースで位置を調整。'),
    ).toBeInTheDocument()

    const lyricsInput = openLyricsLineInput(1)

    expect(lyricsInput).toHaveAttribute(
      'placeholder',
      '歌詞を入力。スペースで位置を調整。',
    )
    expect(lyricsInput).toHaveValue('')
  })

  it('switches the lyrics placeholder hint to English', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'English',
      }),
    )

    expect(
      screen.getByText('Enter lyrics. Use spaces to adjust alignment.'),
    ).toBeInTheDocument()

    const lyricsInput = openLyricsLineInput(1)

    expect(lyricsInput).toHaveAttribute(
      'placeholder',
      'Enter lyrics. Use spaces to adjust alignment.',
    )
    expect(lyricsInput).toHaveValue('')
  })

  it('applies the configured spacing between adjacent layout blocks', () => {
    render(<App />)

    addChordBlockToRow(1)

    const [firstBlock, secondBlock] = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })

    expect(firstBlock).toHaveStyle({ left: '16px' })
    expect(secondBlock).toHaveStyle({ left: '174px' })
  })

  it('pushes following blocks rightward when a block is dragged beyond its spacing', () => {
    render(<App />)

    for (let index = 0; index < 2; index += 1) {
      addChordBlockToRow(1)
    }

    dragLayoutBlock(getItemOrThrow(getLayoutBlocks(), 1), 200, 320)

    const updatedBlocks = getLayoutBlocks()

    expect(updatedBlocks[1]).toHaveStyle({ left: '294px' })
    expect(updatedBlocks[2]).toHaveStyle({ left: '446px' })
  })

  it('slides a layout block horizontally by dragging it', () => {
    render(<App />)

    for (let index = 0; index < 2; index += 1) {
      addChordBlockToRow(1)
    }

    dragLayoutBlock(getItemOrThrow(getLayoutBlocks(), 2), 300, 340)

    const updatedBlocks = getLayoutBlocks()

    expect(updatedBlocks[2]).toHaveStyle({ left: '372px' })
  })

  it('applies each block horizontal offset from its pushed position', () => {
    render(<App />)

    for (let index = 0; index < 2; index += 1) {
      addChordBlockToRow(1)
    }

    dragLayoutBlock(getItemOrThrow(getLayoutBlocks(), 0), 100, 220, 1)
    dragLayoutBlock(getItemOrThrow(getLayoutBlocks(), 1), 200, 220, 2)
    dragLayoutBlock(getItemOrThrow(getLayoutBlocks(), 2), 300, 340, 3)

    const updatedBlocks = getLayoutBlocks()

    expect(updatedBlocks[0]).toHaveStyle({ left: '136px' })
    expect(updatedBlocks[1]).toHaveStyle({ left: '308px' })
    expect(updatedBlocks[2]).toHaveStyle({ left: '500px' })
  })

  it('expands the stage enough to keep four blocks and the add button inside the row frame', () => {
    const { container } = render(<App />)

    for (let index = 0; index < 3; index += 1) {
      addChordBlockToRow(1)
    }

    expect(container.querySelector('.layout-stage')).toHaveStyle({
      width: '782.4px',
    })
  })

  it('expands the stage when a horizontal offset pushes the last block rightward', () => {
    const { container } = render(<App />)

    for (let index = 0; index < 3; index += 1) {
      addChordBlockToRow(1)
    }

    dragLayoutBlock(getItemOrThrow(getLayoutBlocks(), 3), 400, 520)

    const blocks = getLayoutBlocks()

    expect(blocks[3]).toHaveStyle({ left: '610px' })
    expect(container.querySelector('.layout-stage')).toHaveStyle({
      width: '902.4px',
    })
  })

  it('adds the current chord to stock from the stock modal and prevents duplicates', () => {
    render(<App />)

    addCurrentChordToStock()

    const stockPanel = screen.getByRole('region', {
      name: 'コードストック',
    })

    expect(
      within(stockPanel).getByRole('heading', { name: 'E' }),
    ).toBeInTheDocument()

    const duplicateDialog = openStockModal()

    expect(
      within(getModalActions(duplicateDialog)).getByRole('button', {
        name: 'このコードはストック済み',
      }),
    ).toBeDisabled()
  })

  it('adds layout rows and assigns the selected block to another row', () => {
    render(<App />)

    addChordBlockToRow(1)
    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    const rowSelect = screen.getByLabelText('Block row') as HTMLSelectElement

    fireEvent.change(rowSelect, {
      target: { value: rowSelect.options[1]?.value ?? '' },
    })

    const firstRow = getLayoutRow(1)
    const secondRow = getLayoutRow(2)

    expect(
      within(firstRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)
    expect(
      within(secondRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)
  })

  it('adds a generated chord to the selected empty layout row from that row modal', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    addChordBlockToRow(2)

    const firstRow = getLayoutRow(1)
    const secondRow = getLayoutRow(2)

    expect(
      within(firstRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)
    expect(
      within(secondRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)
  })

  it('deletes the selected layout row and moves its blocks to an adjacent row', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )
    addChordBlockToRow(2)

    const firstRow = getLayoutRow(1)
    const secondRow = getLayoutRow(2)

    expect(
      within(firstRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)
    expect(
      within(secondRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)

    fireEvent.click(
      screen.getByRole('button', {
        name: '選択行を削除',
      }),
    )

    expect(
      screen.queryByRole('button', {
        name: /^(歌詞 2 行|Lyrics line 2)$/,
      }),
    ).not.toBeInTheDocument()
    expect(
      within(getLayoutRow(1)).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(2)
  })

  it('shows stock entries inside the layout add modal and adds a stocked chord to the target row', () => {
    render(<App />)

    addCurrentChordToStock()
    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    const dialog = openLayoutAddModal(2)
    const modalStockRegion = within(dialog).getByRole('region', {
      name: 'コードストック',
    })

    fireEvent.click(
      within(modalStockRegion).getByRole('button', {
        name: '2行目 に追加',
      }),
    )

    const firstRow = getLayoutRow(1)
    const secondRow = getLayoutRow(2)

    expect(
      within(firstRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)
    expect(
      within(secondRow).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(1)
  })

  it('updates a selected layout block from the edit modal', () => {
    render(<App />)

    const dialog = openEditModal()

    fireEvent.change(within(dialog).getByLabelText('Chord name'), {
      target: { value: 'Intro E' },
    })
    submitModal(dialog, '変更を保存')

    expect(
      screen.getByRole('button', {
        name: 'Select Intro E block',
      }),
    ).toBeInTheDocument()
  })

  it('allows direct manual fret selection from the modal builder', () => {
    render(<App />)

    const dialog = openStockModal()

    fireEvent.change(within(dialog).getByLabelText('Manual start fret'), {
      target: { value: '5' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: '6弦 5フレット',
      }),
    )

    expect(
      within(dialog).getByRole('button', {
        name: '6弦 5フレット',
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    const bassInfo = within(dialog).getByText('ベース音').closest('div')

    expect(bassInfo).toHaveTextContent('A')
  })

  it('exports the current project as JSON', async () => {
    let exportedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob
      return 'blob:project-export'
    })
    const revokeObjectURL = vi.fn()
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
      writable: true,
    })

    try {
      render(<App />)

      fireEvent.change(openLyricsLineInput(1), {
        target: { value: 'Exported line' },
      })
      fireEvent.click(
        screen.getByRole('button', {
          name: 'プロジェクトを書き出し',
        }),
      )

      expect(exportedBlob).not.toBeNull()
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:project-export')
      expect(screen.getByRole('status')).toHaveTextContent(
        'chordcanvas-project.json を書き出しました。',
      )

      const projectDocument = JSON.parse(await exportedBlob!.text())

      expect(projectDocument.format).toBe('chordcanvas-project')
      expect(projectDocument.version).toBe(1)
      expect(projectDocument.state.currentFretting).toEqual([0, 2, 2, 1, 0, 0])
      expect(projectDocument.state.layoutRows[0].lyrics).toBe('Exported line')
      expect(projectDocument.state.stockChords).toEqual([])
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
        writable: true,
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
        writable: true,
      })
      clickSpy.mockRestore()
    }
  })

  it('exports the current layout as PDF', async () => {
    const exportCanvas = document.createElement('canvas')
    let capturedBlockLeft = ''
    let capturedLyricsLineTagName = ''
    let capturedLyricsText = ''
    let capturedRowPaddingInline = ''
    let capturedStagePaddingInline = ''
    const fakeContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => fakeContext)

    exportCanvas.width = 1200
    exportCanvas.height = 2500
    pdfMocks.html2canvas.mockImplementation(async (stageElement: HTMLElement) => {
      const layoutBlock =
        stageElement.querySelector<HTMLElement>('.layout-chord-block.selected')
      const lyricsLine = stageElement.querySelector<HTMLElement>('.lyrics-line')

      capturedStagePaddingInline = stageElement.style.getPropertyValue(
        '--layout-stage-padding-inline',
      )
      capturedRowPaddingInline = stageElement.style.getPropertyValue(
        '--layout-row-padding-inline',
      )
      capturedBlockLeft = layoutBlock?.style.left ?? ''
      capturedLyricsLineTagName = lyricsLine?.tagName ?? ''
      capturedLyricsText = lyricsLine?.textContent ?? ''

      return exportCanvas
    })

    try {
      const { container } = render(<App />)

      fireEvent.change(openLyricsLineInput(1), {
        target: { value: '  Exported line  ' },
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: 'レイアウトを PDF 出力',
        }),
      )

      await waitFor(() => {
        expect(pdfMocks.html2canvas).toHaveBeenCalledTimes(1)
      })

      const layoutStage = container.querySelector('.layout-stage')
      const pdfInstance = pdfMocks.pdfInstances[0]

      expect(pdfMocks.jsPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'a4',
          orientation: 'portrait',
          unit: 'pt',
        }),
      )
      expect(pdfInstance?.addImage).toHaveBeenCalled()
      expect(pdfInstance?.addPage).toHaveBeenCalledTimes(1)
      expect(pdfInstance?.save).toHaveBeenCalledWith('chordcanvas-layout.pdf', {
        returnPromise: true,
      })
      expect(capturedStagePaddingInline).toBe('0px')
      expect(capturedRowPaddingInline).toBe('0px')
      expect(capturedBlockLeft).toBe('16px')
      expect(capturedLyricsLineTagName).toBe('DIV')
      expect(capturedLyricsText).toBe('  Exported line  ')
      expect(layoutStage).not.toHaveAttribute('data-exporting-pdf')
      expect(screen.getByRole('status')).toHaveTextContent(
        'chordcanvas-layout.pdf を書き出しました。',
      )
    } finally {
      getContextSpy.mockRestore()
    }
  })

  it('imports a saved project JSON and reflects it in the layout and modals', async () => {
    const importedSnapshot: ProjectSnapshot = {
      selectedRoot: 'A',
      selectedQuality: 'minor',
      selectedFormId: 'open-a-minor',
      currentFretting: toFretting(['x', 0, 2, 2, 1, 0]),
      currentChordName: 'Verse Am',
      layoutRows: [
        { id: 'row-12', lyrics: 'Verse line' },
        { id: 'row-18', lyrics: 'Bridge line' },
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
      manualStartFret: 5,
      manualFretCount: 4,
    }

    render(<App />)

    fireEvent.change(screen.getByLabelText('Project JSON file'), {
      target: {
        files: [
          new File(
            [serializeProjectFile(importedSnapshot)],
            'saved-project.json',
            { type: 'application/json' },
          ),
        ],
      },
    })

    await waitFor(() => {
      expect(getLyricsLineButton(2)).toHaveTextContent('Bridge line')
    })

    expect(
      screen.getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(2)
    expect(screen.getByLabelText('Block row')).toHaveValue('row-18')
    expect(
      screen.getByRole('button', {
        name: 'Select Bridge F block',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Select Verse Am block',
      }),
    ).toHaveStyle({ left: '28px' })
    expect(
      screen.getByRole('button', {
        name: 'Select Bridge F block',
      }),
    ).toHaveStyle({ left: '21px' })
    expect(
      within(
        screen.getByRole('region', {
          name: 'コードストック',
        }),
      ).getByRole('heading', {
        name: 'Stock Am',
      }),
    ).toBeInTheDocument()

    const stockDialog = openStockModal()

    expect(within(stockDialog).getByLabelText('Root note')).toHaveValue('A')
    expect(within(stockDialog).getByLabelText('Chord quality')).toHaveValue(
      'minor',
    )
    expect(within(stockDialog).getByLabelText('Manual start fret')).toHaveValue(5)
    expect(within(stockDialog).getByLabelText('Manual fret count')).toHaveValue(5)
    expect(within(stockDialog).getByLabelText('Chord name')).toHaveValue(
      'Verse Am',
    )

    fireEvent.click(
      within(getModalActions(stockDialog)).getByRole('button', {
        name: '閉じる',
      }),
    )

    const editDialog = openEditModal()

    expect(within(editDialog).getByLabelText('Chord name')).toHaveValue(
      'Bridge F',
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'saved-project.json を読み込みました。',
    )
  })
})

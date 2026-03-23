import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pdfMocks = vi.hoisted(() => {
  function getPdfPageSize(options?: {
    format?: string | number[]
    orientation?: string
  }) {
    if (Array.isArray(options?.format)) {
      return {
        height: options.format[1] ?? 841.89,
        width: options.format[0] ?? 595.28,
      }
    }

    const isPortrait =
      options?.orientation === undefined ||
      options.orientation === 'p' ||
      options.orientation === 'portrait'

    return {
      height: isPortrait ? 841.89 : 595.28,
      width: isPortrait ? 595.28 : 841.89,
    }
  }

  const html2canvas = vi.fn()
  const pdfInstances: Array<{
    addImage: ReturnType<typeof vi.fn>
    addPage: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
    setDisplayMode: ReturnType<typeof vi.fn>
    setDocumentProperties: ReturnType<typeof vi.fn>
  }> = []
  const jsPDF = vi.fn(function JsPdfMock(options?: {
    format?: string | number[]
    orientation?: string
  }) {
    const { height, width } = getPdfPageSize(options)
    const instance = {
      addImage: vi.fn(),
      addPage: vi.fn(),
      internal: {
        pageSize: {
          getHeight: () => height,
          getWidth: () => width,
        },
      },
      save: vi.fn().mockResolvedValue(undefined),
      setDisplayMode: vi.fn(),
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

const pdfLibMocks = vi.hoisted(() => {
  const documents: Array<{
    addPage: ReturnType<typeof vi.fn>
    embedPng: ReturnType<typeof vi.fn>
    page: {
      drawImage: ReturnType<typeof vi.fn>
    }
    save: ReturnType<typeof vi.fn>
    setSubject: ReturnType<typeof vi.fn>
    setTitle: ReturnType<typeof vi.fn>
  }> = []
  const PDFDocument = {
    create: vi.fn(async () => {
      const page = {
        drawImage: vi.fn(),
      }
      const document = {
        addPage: vi.fn(() => page),
        embedPng: vi.fn().mockResolvedValue({}),
        page,
        save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        setSubject: vi.fn(),
        setTitle: vi.fn(),
      }

      documents.push(document)
      return document
    }),
  }

  return {
    documents,
    PDFDocument,
  }
})

vi.mock('html2canvas', () => ({
  default: pdfMocks.html2canvas,
}))

vi.mock('jspdf', () => ({
  jsPDF: pdfMocks.jsPDF,
}))

vi.mock('pdf-lib', () => pdfLibMocks)

import App from './App'
import './index.css'
import { toFretting } from './music/chords'
import {
  serializeProjectFile,
  type ProjectSnapshot,
} from './project/projectFile'
import { UI_TEXT } from './uiText'

afterEach(() => {
  cleanup()
  pdfMocks.html2canvas.mockReset()
  pdfMocks.jsPDF.mockClear()
  pdfMocks.pdfInstances.length = 0
  pdfLibMocks.PDFDocument.create.mockClear()
  pdfLibMocks.documents.length = 0
})

const layoutBlockButtonNamePattern = /^(.+ を選択|Select .+ block)$/

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getLayoutBlockButtonName(displayName: string): RegExp {
  const escapedName = escapeForRegExp(displayName)

  return new RegExp(`^(${escapedName} を選択|Select ${escapedName} block)$`)
}

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

function getLayoutBlockContainer(element: HTMLElement): HTMLElement {
  const block = element.matches('.layout-chord-block')
    ? element
    : element.closest('.layout-chord-block')

  if (!(block instanceof HTMLElement)) {
    throw new Error('Expected layout block container')
  }

  return block
}

function getLayoutBlocks(): HTMLElement[] {
  return screen
    .getAllByRole('button', {
      name: layoutBlockButtonNamePattern,
    })
    .map((button) => getLayoutBlockContainer(button))
}

function getLayoutBlockByName(displayName: string): HTMLElement {
  return getLayoutBlockContainer(
    screen.getByRole('button', {
      name: getLayoutBlockButtonName(displayName),
    }),
  )
}

function getSelectedLayoutBlock(): HTMLElement {
  const block = document.querySelector('.layout-chord-block.selected')

  if (!(block instanceof HTMLElement)) {
    throw new Error('Expected selected layout block')
  }

  return block
}

function dragLayoutBlock(
  block: HTMLElement,
  startClientX: number,
  endClientX: number,
  pointerId = 1,
) {
  const dragHandle = block.matches('.layout-chord-block')
    ? block.querySelector('.layout-chord-block-button')
    : block

  if (!(dragHandle instanceof HTMLElement)) {
    throw new Error('Expected layout block drag handle')
  }

  fireEvent.pointerDown(dragHandle, {
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
    name: /^(コードを追加|Add chord)$/,
  })
}

function getLayoutRowDeleteButton(index: number): HTMLElement {
  return within(getLayoutRow(index)).getByRole('button', {
    name: /^(行を削除|Delete row)$/,
  })
}

function getStockPanel(): HTMLElement {
  const panel = document.querySelector('.stock-panel')

  if (!(panel instanceof HTMLElement)) {
    throw new Error('Expected stock panel')
  }

  return panel
}

function getOpenStockModalButton(): HTMLElement {
  return within(getStockPanel()).getByRole('button', {
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
    name: /^(コードを追加|Add Chord)$/,
  })
}

function openEditModal(): HTMLElement {
  if (
    !screen.queryByRole('button', {
      name: /^(編集|Edit)$/,
    })
  ) {
    const selectedBlockButton = getSelectedLayoutBlock().querySelector(
      '.layout-chord-block-button',
    )

    if (!(selectedBlockButton instanceof HTMLElement)) {
      throw new Error('Expected selected layout block button')
    }

    fireEvent.click(selectedBlockButton)
  }

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
  submitModal(dialog, /^(追加|Add)$/)
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
        name: 'コード譜編集',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'コード選択',
      }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', {
        name: 'コードダイアグラム',
      }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', {
        name: 'コード情報',
      }),
    ).toBeNull()
    expect(getOpenStockModalButton()).toBeInTheDocument()
    expect(getOpenStockModalButton()).toHaveClass('stock-add-button-empty')
    expect(
      getOpenStockModalButton().closest('.stock-empty-state'),
    ).not.toBeNull()
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
        name: 'Chord Selection',
      }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('heading', {
        name: 'Chord Diagram',
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
    expect(getLayoutAddButton(1)).toHaveAccessibleName('Add chord')
  })

  it('localizes the project file input aria label', () => {
    render(<App />)

    expect(
      screen.getByLabelText(UI_TEXT.ja.projectFileInputAriaLabel),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'English',
      }),
    )

    expect(
      screen.getByLabelText(UI_TEXT.en.projectFileInputAriaLabel),
    ).toBeInTheDocument()
  })

  it('shows localized project import errors in English', async () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'English',
      }),
    )

    fireEvent.change(
      screen.getByLabelText(UI_TEXT.en.projectFileInputAriaLabel),
      {
        target: {
          files: [
            new File(['{invalid json'], 'invalid-project.json', {
              type: 'application/json',
            }),
          ],
        },
      },
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Import failed: Could not parse the JSON file.',
      )
    })
  })

  it('shows localized pdf export errors in English', async () => {
    const exportCanvas = document.createElement('canvas')
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null)

    exportCanvas.width = 1200
    exportCanvas.height = 2500
    pdfMocks.html2canvas.mockResolvedValue(exportCanvas)

    try {
      render(<App />)

      fireEvent.click(
        screen.getByRole('button', {
          name: 'English',
        }),
      )

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Print PDF',
        }),
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'PDF export failed: Could not initialize the canvas context for PDF export.',
        )
      })
    } finally {
      getContextSpy.mockRestore()
    }
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

    const [firstBlock, secondBlock] = getLayoutBlocks()

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

    const stockPanel = getStockPanel()

    expect(
      within(stockPanel).getByRole('heading', { name: 'E' }),
    ).toBeInTheDocument()
    expect(
      within(stockPanel).queryByRole('button', {
        name: '削除',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(stockPanel).getByRole('button', {
        name: 'E をストックから削除',
      }),
    ).toBeInTheDocument()

    const duplicateDialog = openStockModal()

    expect(
      within(getModalActions(duplicateDialog)).getByRole('button', {
        name: 'このコードはストック済み',
      }),
    ).toBeDisabled()
    expect(getOpenStockModalButton()).toHaveClass('stock-add-button')
    expect(getOpenStockModalButton()).not.toHaveClass('stock-add-button-empty')
    expect(getOpenStockModalButton().closest('.stock-grid')).not.toBeNull()
  })

  it('removes a stocked chord from the card close button', () => {
    render(<App />)

    addCurrentChordToStock()

    const stockPanel = getStockPanel()

    fireEvent.click(
      within(stockPanel).getByRole('button', {
        name: 'E をストックから削除',
      }),
    )

    expect(
      within(stockPanel).queryByRole('heading', { name: 'E' }),
    ).not.toBeInTheDocument()
    expect(
      within(stockPanel).getByText(/ストックはまだ空です。/),
    ).toBeInTheDocument()
    expect(getOpenStockModalButton()).toHaveClass('stock-add-button-empty')
  })

  it('adds layout rows without exposing a row reassignment control', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    expect(getLayoutRow(2)).toBeInTheDocument()
    expect(screen.queryByLabelText('Block row')).not.toBeInTheDocument()
  })

  it('shows layout actions only after explicit block selection and keeps rows compact', () => {
    render(<App />)

    expect(
      screen.queryByRole('button', {
        name: /^(編集|Edit)$/,
      }),
    ).toBeNull()

    fireEvent.click(
      within(getLayoutRow(1)).getByRole('button', {
        name: layoutBlockButtonNamePattern,
      }),
    )

    expect(
      screen.getByRole('button', {
        name: /^(編集|Edit)$/,
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    expect(
      screen.queryByRole('button', {
        name: /^(編集|Edit)$/,
      }),
    ).toBeNull()

    addChordBlockToRow(2)

    expect(
      screen.queryByRole('button', {
        name: /^(編集|Edit)$/,
      }),
    ).toBeNull()

    fireEvent.click(
      within(getLayoutRow(2)).getByRole('button', {
        name: layoutBlockButtonNamePattern,
      }),
    )

    expect(
      screen.getByRole('button', {
        name: /^(編集|Edit)$/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /^(複製|Duplicate)$/,
      }),
    ).toBeInTheDocument()
  })

  it('renders the drag hint as a delayed custom hover tooltip on the layout block', () => {
    vi.useFakeTimers()

    try {
      render(<App />)

      const blockButton = within(getLayoutRow(1)).getByRole('button', {
        name: layoutBlockButtonNamePattern,
      })

      expect(blockButton).not.toHaveAttribute('title')
      expect(screen.queryByText('左右に移動')).toBeNull()

      fireEvent.mouseEnter(blockButton)

      expect(screen.queryByText('左右に移動')).toBeNull()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(screen.getByText('左右に移動')).toHaveClass(
        'layout-block-hover-hint',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders the add row tooltip as a delayed custom hover tooltip on the add row button', () => {
    vi.useFakeTimers()

    try {
      render(<App />)

      const addRowButton = screen.getByRole('button', {
        name: '行を追加',
      })

      expect(addRowButton).not.toHaveAttribute('title')
      expect(screen.queryByText('行を追加')).toBeNull()

      fireEvent.mouseEnter(addRowButton)

      expect(screen.queryByText('行を追加')).toBeNull()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(screen.getByText('行を追加')).toHaveClass(
        'layout-block-hover-hint',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders the stock add tooltip as a delayed custom hover tooltip on the stock add button', () => {
    vi.useFakeTimers()

    try {
      render(<App />)

      const stockAddButton = getOpenStockModalButton()

      expect(stockAddButton).not.toHaveAttribute('title')
      expect(screen.queryByText('ストックを追加')).toBeNull()

      fireEvent.mouseEnter(stockAddButton)

      expect(screen.queryByText('ストックを追加')).toBeNull()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(screen.getByText('ストックを追加')).toHaveClass(
        'layout-block-hover-hint',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders the add chord tooltip as a delayed custom hover tooltip on the layout add button', () => {
    vi.useFakeTimers()

    try {
      render(<App />)

      const addChordButton = getLayoutAddButton(1)

      expect(addChordButton).not.toHaveAttribute('title')
      expect(screen.queryByText('コードを追加')).toBeNull()

      fireEvent.mouseEnter(addChordButton)

      expect(screen.queryByText('コードを追加')).toBeNull()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(screen.getByText('コードを追加')).toHaveClass(
        'layout-block-hover-hint',
      )
    } finally {
      vi.useRealTimers()
    }
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
        name: layoutBlockButtonNamePattern,
      }),
    ).toHaveLength(1)
    expect(
      within(secondRow).getAllByRole('button', {
        name: layoutBlockButtonNamePattern,
      }),
    ).toHaveLength(1)
  })

  it('deletes a layout row from its row close button and moves its blocks to an adjacent row', () => {
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
        name: layoutBlockButtonNamePattern,
      }),
    ).toHaveLength(1)
    expect(
      within(secondRow).getAllByRole('button', {
        name: layoutBlockButtonNamePattern,
      }),
    ).toHaveLength(1)

    fireEvent.click(getLayoutRowDeleteButton(2))

    expect(
      screen.queryByRole('button', {
        name: /^(歌詞 2 行|Lyrics line 2)$/,
      }),
    ).not.toBeInTheDocument()
    expect(
      within(getLayoutRow(1)).getAllByRole('button', {
        name: layoutBlockButtonNamePattern,
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
        name: '追加',
      }),
    )

    const firstRow = getLayoutRow(1)
    const secondRow = getLayoutRow(2)

    expect(
      within(firstRow).getAllByRole('button', {
        name: layoutBlockButtonNamePattern,
      }),
    ).toHaveLength(1)
    expect(
      within(secondRow).getAllByRole('button', {
        name: layoutBlockButtonNamePattern,
      }),
    ).toHaveLength(1)
  })

  it('adds the current draft to stock from the layout add modal without closing it', () => {
    render(<App />)

    const dialog = openLayoutAddModal(1)

    fireEvent.click(
      within(getModalActions(dialog)).getByRole('button', {
        name: /^(ストックに追加|Add to Stock)$/,
      }),
    )

    const modalStockRegion = within(dialog).getByRole('region', {
      name: 'コードストック',
    })

    expect(
      within(getStockPanel()).getByRole('heading', {
        name: 'E',
      }),
    ).toBeInTheDocument()
    expect(
      within(modalStockRegion).getByRole('heading', {
        name: 'E',
      }),
    ).toBeInTheDocument()
    expect(
      within(getModalActions(dialog)).getByRole('button', {
        name: /^(このコードはストック済み|Already in Stock)$/,
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('dialog', {
        name: /^(コードを追加|Add Chord)$/,
      }),
    ).toBeInTheDocument()
  })

  it('updates a selected layout block from the edit modal', () => {
    render(<App />)

    const dialog = openEditModal()

    fireEvent.change(within(dialog).getByLabelText('任意コード名'), {
      target: { value: 'Intro E' },
    })
    submitModal(dialog, '変更を保存')

    expect(
      screen.getByRole('button', {
        name: getLayoutBlockButtonName('Intro E'),
      }),
    ).toBeInTheDocument()
  })

  it('removes a layout block from the card close button', () => {
    render(<App />)

    addChordBlockToRow(1)

    const dialog = openEditModal()

    fireEvent.change(within(dialog).getByLabelText('任意コード名'), {
      target: { value: 'Intro E' },
    })
    submitModal(dialog, '変更を保存')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Intro E をレイアウトから削除',
      }),
    )

    expect(
      screen.queryByRole('button', {
        name: getLayoutBlockButtonName('Intro E'),
      }),
    ).not.toBeInTheDocument()
    expect(getLayoutBlocks()).toHaveLength(1)
  })

  it('allows direct manual fret selection from the modal builder', () => {
    render(<App />)

    const dialog = openStockModal()

    fireEvent.change(within(dialog).getByLabelText(UI_TEXT.ja.startFret), {
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

  it('uses a shared square unit for the manual fret matrix columns', () => {
    render(<App />)

    const dialog = openStockModal()
    const firstRow = dialog.querySelector('.manual-grid-row')

    if (!(firstRow instanceof HTMLElement)) {
      throw new Error('Expected manual grid row')
    }

    const rowButtons = within(firstRow).getAllByRole('button')
    const manualGrid = firstRow.closest('.manual-grid')

    expect(manualGrid).not.toBeNull()
    expect(
      (manualGrid as HTMLElement).style.getPropertyValue(
        '--manual-grid-column-count',
      ),
    ).toBe(String(rowButtons.length + 1))
    expect(firstRow.style.gridTemplateColumns).toBe(
      `repeat(${rowButtons.length + 1}, var(--manual-grid-unit))`,
    )
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
          name: 'プロジェクトを保存',
        }),
      )

      expect(exportedBlob).not.toBeNull()
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:project-export')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()

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

  it('exports the current layout as A4 PDF', async () => {
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
    pdfMocks.html2canvas.mockImplementation(
      async (stageElement: HTMLElement) => {
        const layoutBlock = stageElement.querySelector<HTMLElement>(
          '.layout-chord-block.selected',
        )
        const lyricsLine =
          stageElement.querySelector<HTMLElement>('.lyrics-line')

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
      },
    )

    try {
      const { container } = render(<App />)

      fireEvent.change(openLyricsLineInput(1), {
        target: { value: '  Exported line  ' },
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: '印刷用PDF',
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
      expect(pdfInstance?.setDisplayMode).toHaveBeenCalledWith('fullwidth')
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
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      getContextSpy.mockRestore()
    }
  })

  it('exports the current layout as a tall single-page PDF', async () => {
    const exportCanvas = document.createElement('canvas')
    let capturedBlockLeft = ''
    let capturedLyricsLineTagName = ''
    let capturedLyricsText = ''
    let capturedRowPaddingInline = ''
    let capturedStagePaddingInline = ''
    const toDataUrlSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,layout-long-pdf')
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:layout-long-pdf'),
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    })

    exportCanvas.width = 1200
    exportCanvas.height = 2500
    pdfMocks.html2canvas.mockImplementation(
      async (stageElement: HTMLElement) => {
        const layoutBlock = stageElement.querySelector<HTMLElement>(
          '.layout-chord-block.selected',
        )
        const lyricsLine =
          stageElement.querySelector<HTMLElement>('.lyrics-line')

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
      },
    )

    try {
      const { container } = render(<App />)

      fireEvent.change(openLyricsLineInput(1), {
        target: { value: '  Exported line  ' },
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: '表示用PDF',
        }),
      )

      await waitFor(() => {
        expect(pdfMocks.html2canvas).toHaveBeenCalledTimes(1)
      })

      const layoutStage = container.querySelector('.layout-stage')
      const pdfDocument = pdfLibMocks.documents[0]
      const expectedContentWidth = 595.28 - 32 * 2
      const expectedRenderedHeight =
        (exportCanvas.height * expectedContentWidth) / exportCanvas.width
      const createObjectUrl = URL.createObjectURL as ReturnType<typeof vi.fn>
      const revokeObjectUrl = URL.revokeObjectURL as ReturnType<typeof vi.fn>

      expect(pdfLibMocks.PDFDocument.create).toHaveBeenCalledTimes(1)
      expect(pdfDocument?.addPage).toHaveBeenCalledWith([
        595.28,
        expectedRenderedHeight + 32 * 2,
      ])
      expect(pdfDocument?.embedPng).toHaveBeenCalledWith(
        'data:image/png;base64,layout-long-pdf',
      )
      expect(pdfDocument?.page.drawImage).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          height: expectedRenderedHeight,
          width: expectedContentWidth,
          x: 32,
          y: 32,
        }),
      )
      expect(pdfDocument?.setTitle).toHaveBeenCalledWith(
        'ChordCanvas Layout Long',
      )
      expect(pdfDocument?.setSubject).toHaveBeenCalledWith(
        'ChordCanvas layout export',
      )
      expect(pdfDocument?.save).toHaveBeenCalledTimes(1)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(createObjectUrl).toHaveBeenCalledTimes(1)
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:layout-long-pdf')
      expect(capturedStagePaddingInline).toBe('0px')
      expect(capturedRowPaddingInline).toBe('0px')
      expect(capturedBlockLeft).toBe('16px')
      expect(capturedLyricsLineTagName).toBe('DIV')
      expect(capturedLyricsText).toBe('  Exported line  ')
      expect(layoutStage).not.toHaveAttribute('data-exporting-pdf')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
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
      toDataUrlSpy.mockRestore()
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

    fireEvent.change(
      screen.getByLabelText(UI_TEXT.ja.projectFileInputAriaLabel),
      {
        target: {
          files: [
            new File(
              [serializeProjectFile(importedSnapshot)],
              'saved-project.json',
              { type: 'application/json' },
            ),
          ],
        },
      },
    )

    await waitFor(() => {
      expect(getLyricsLineButton(2)).toHaveTextContent('Bridge line')
    })

    expect(
      screen.getAllByRole('button', {
        name: layoutBlockButtonNamePattern,
      }),
    ).toHaveLength(2)
    expect(screen.queryByLabelText('Block row')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: getLayoutBlockButtonName('Bridge F'),
      }),
    ).toBeInTheDocument()
    expect(getLayoutBlockByName('Verse Am')).toHaveStyle({ left: '28px' })
    expect(getLayoutBlockByName('Bridge F')).toHaveStyle({ left: '21px' })
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

    expect(within(stockDialog).getByLabelText(UI_TEXT.ja.rootNote)).toHaveValue(
      'A',
    )
    expect(
      within(stockDialog).getByLabelText(UI_TEXT.ja.chordQuality),
    ).toHaveValue('minor')
    expect(
      within(stockDialog).getByLabelText(UI_TEXT.ja.startFret),
    ).toHaveValue(5)
    expect(
      within(stockDialog).getByLabelText(UI_TEXT.ja.visibleFretCount),
    ).toHaveValue(5)
    expect(within(stockDialog).getByLabelText('任意コード名')).toHaveValue(
      'Verse Am',
    )

    fireEvent.click(within(stockDialog).getByRole('button', { name: '閉じる' }))

    const editDialog = openEditModal()

    expect(within(editDialog).getByLabelText('任意コード名')).toHaveValue(
      'Bridge F',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

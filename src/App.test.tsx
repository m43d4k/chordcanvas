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
  const jsPDF = vi.fn(function JsPdfMock() {
    const instance = {
      addImage: vi.fn(),
      addPage: vi.fn(),
      internal: {
        pageSize: {
          getHeight: () => 595.28,
          getWidth: () => 841.89,
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

describe('App', () => {
  it('renders the chord editor panels', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /ChordCanvas/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'コード生成パネル',
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
  })

  it('uses a tighter default block spacing in the layout editor', () => {
    render(<App />)

    expect(screen.getByLabelText('Block spacing')).toHaveValue(6)
  })

  it('applies the configured spacing between adjacent layout blocks', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '現在のコードを追加',
      }),
    )

    const [firstBlock, secondBlock] = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })

    expect(firstBlock).toHaveStyle({ left: '16px' })
    expect(secondBlock).toHaveStyle({ left: '174px' })
  })

  it('pushes following blocks rightward to avoid overlap after a horizontal offset', () => {
    render(<App />)

    for (let index = 0; index < 2; index += 1) {
      fireEvent.click(
        screen.getByRole('button', {
          name: '現在のコードを追加',
        }),
      )
    }

    const blocks = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })

    fireEvent.click(blocks[1])
    fireEvent.change(screen.getByLabelText('Block horizontal offset'), {
      target: { value: '120' },
    })

    const updatedBlocks = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })

    expect(updatedBlocks[1]).toHaveStyle({ left: '294px' })
    expect(updatedBlocks[2]).toHaveStyle({ left: '452px' })
  })

  it('removes leading zeroes from layout number inputs', () => {
    render(<App />)

    const offsetInput = screen.getByLabelText('Block horizontal offset')
    const spacingInput = screen.getByLabelText('Block spacing')

    fireEvent.change(offsetInput, { target: { value: '6' } })
    fireEvent.change(offsetInput, { target: { value: '06' } })
    fireEvent.change(spacingInput, { target: { value: '24' } })
    fireEvent.change(spacingInput, { target: { value: '024' } })

    expect(offsetInput).toHaveDisplayValue('6')
    expect(spacingInput).toHaveDisplayValue('24')
  })

  it('applies each block horizontal offset from its pushed position', () => {
    render(<App />)

    for (let index = 0; index < 2; index += 1) {
      fireEvent.click(
        screen.getByRole('button', {
          name: '現在のコードを追加',
        }),
      )
    }

    let blocks = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })

    fireEvent.click(blocks[0])
    fireEvent.change(screen.getByLabelText('Block horizontal offset'), {
      target: { value: '120' },
    })

    blocks = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })
    fireEvent.click(blocks[1])
    fireEvent.change(screen.getByLabelText('Block horizontal offset'), {
      target: { value: '20' },
    })

    blocks = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })
    fireEvent.click(blocks[2])
    fireEvent.change(screen.getByLabelText('Block horizontal offset'), {
      target: { value: '40' },
    })

    const updatedBlocks = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })

    expect(updatedBlocks[0]).toHaveStyle({ left: '136px' })
    expect(updatedBlocks[1]).toHaveStyle({ left: '314px' })
    expect(updatedBlocks[2]).toHaveStyle({ left: '512px' })
  })

  it('expands the stage enough to keep four blocks inside the row frame', () => {
    const { container } = render(<App />)

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(
        screen.getByRole('button', {
          name: '現在のコードを追加',
        }),
      )
    }

    expect(container.querySelector('.layout-stage')).toHaveStyle({
      width: '710.4px',
    })
  })

  it('expands the stage when a horizontal offset pushes the last block rightward', () => {
    const { container } = render(<App />)

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(
        screen.getByRole('button', {
          name: '現在のコードを追加',
        }),
      )
    }

    fireEvent.change(screen.getByLabelText('Block horizontal offset'), {
      target: { value: '120' },
    })

    const blocks = screen.getAllByRole('button', {
      name: /^Select .* block$/,
    })

    expect(blocks[3]).toHaveStyle({ left: '610px' })
    expect(container.querySelector('.layout-stage')).toHaveStyle({
      width: '830.4px',
    })
  })

  it('updates the selected chord when generator controls change', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText(/Root note/i), {
      target: { value: 'A' },
    })
    fireEvent.change(screen.getByLabelText(/Chord quality/i), {
      target: { value: 'minor' },
    })

    expect(
      screen.getAllByRole('heading', {
        name: 'Am',
      })[0],
    ).toBeInTheDocument()
  })

  it('adds a generated chord block to the layout stage', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '現在のコードを追加',
      }),
    )

    expect(
      screen.getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(2)
  })

  it('adds the current chord to stock and avoids duplicate stock entries', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'ストックに追加',
      }),
    )

    const stockPanel = screen.getByRole('region', {
      name: 'コードストック',
    })

    expect(
      within(stockPanel).getByRole('heading', { name: 'E' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'このコードはストック済み',
      }),
    ).toBeDisabled()
    expect(within(stockPanel).getAllByText('E')).toHaveLength(1)
  })

  it('adds layout rows and assigns the selected block to another row', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '現在のコードを追加',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    const rowSelect = screen.getByLabelText('Block row') as HTMLSelectElement

    fireEvent.change(rowSelect, {
      target: { value: rowSelect.options[1]?.value ?? '' },
    })

    expect(screen.getByLabelText('Lyrics line 2')).toBeInTheDocument()

    const firstRow = screen.getByRole('region', {
      name: '1行目',
    })
    const secondRow = screen.getByRole('region', {
      name: '2行目',
    })

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

  it('adds a generated chord to the selected empty layout row', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    const secondRow = screen.getByRole('region', {
      name: '2行目',
    })

    fireEvent.click(
      within(secondRow).getByRole('button', {
        name: '2行目 を追加先にする',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: '現在のコードを追加',
      }),
    )

    const firstRow = screen.getByRole('region', {
      name: '1行目',
    })

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

    expect(
      screen.getByRole('button', {
        name: '選択中の行を削除',
      }),
    ).toBeDisabled()

    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: '現在のコードを追加',
      }),
    )

    const firstRow = screen.getByRole('region', {
      name: '1行目',
    })
    const secondRow = screen.getByRole('region', {
      name: '2行目',
    })

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
        name: '選択中の行を削除',
      }),
    )

    expect(screen.queryByLabelText('Lyrics line 2')).not.toBeInTheDocument()
    expect(
      within(
        screen.getByRole('region', {
          name: '1行目',
        }),
      ).getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(2)
    expect(
      screen.getByRole('button', {
        name: '選択中の行を削除',
      }),
    ).toBeDisabled()
  })

  it('adds a stocked chord to the selected layout row', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'ストックに追加',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: '行を追加',
      }),
    )

    const secondRow = screen.getByRole('region', {
      name: '2行目',
    })

    fireEvent.click(
      within(secondRow).getByRole('button', {
        name: '2行目 を追加先にする',
      }),
    )
    fireEvent.click(
      within(
        screen.getByRole('region', {
          name: 'コードストック',
        }),
      ).getByRole('button', {
        name: '選択中の行に追加',
      }),
    )

    const firstRow = screen.getByRole('region', {
      name: '1行目',
    })

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

  it('shows the layout block name only once', () => {
    render(<App />)

    const layoutButton = screen.getByRole('button', {
      name: 'Select E block',
    })

    expect(within(layoutButton).getAllByText('E')).toHaveLength(1)
  })

  it('preserves manual spacing in layout lyrics', () => {
    const { container } = render(<App />)
    const lyricsInput = screen.getByLabelText('Lyrics line 1')

    fireEvent.change(lyricsInput, {
      target: { value: '  la  la   line  ' },
    })

    const lyricsLine = container.querySelector('.lyrics-line')

    expect(lyricsLine).not.toBeNull()
    expect(lyricsLine?.textContent).toBe('  la  la   line  ')
    expect(getComputedStyle(lyricsLine as HTMLElement).whiteSpace).toBe('pre')
  })

  it('shows the editor chord name only once', () => {
    const { container } = render(<App />)
    const diagramCard = container.querySelector('.diagram-card')

    expect(diagramCard).not.toBeNull()
    expect(
      within(diagramCard as HTMLElement).getAllByRole('heading', {
        name: 'E',
      }),
    ).toHaveLength(1)
    expect(diagramCard?.querySelectorAll('text.diagram-title').length).toBe(0)
  })

  it('uses an edited chord name for the current chord, layout block, and stock', () => {
    const { container } = render(<App />)
    const diagramCard = container.querySelector('.diagram-card')

    fireEvent.change(screen.getByLabelText('Chord name'), {
      target: { value: 'E(add9)' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: '現在のコードを追加',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'ストックに追加',
      }),
    )

    expect(diagramCard).not.toBeNull()
    expect(
      within(diagramCard as HTMLElement).getByRole('heading', {
        name: 'E(add9)',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Select E(add9) block',
      }),
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('region', {
          name: 'コードストック',
        }),
      ).getByRole('heading', {
        name: 'E(add9)',
      }),
    ).toBeInTheDocument()
  })

  it('keeps a single unified fretting editor', () => {
    render(<App />)

    expect(
      screen.getAllByRole('group', {
        name: '押弦入力',
      }),
    ).toHaveLength(1)
  })

  it('shows the first string on the top row of the fretting editor', () => {
    const { container } = render(<App />)
    const stringLabels = [
      ...container.querySelectorAll<HTMLElement>('.manual-grid-string'),
    ].map((label) => label.textContent)

    expect(stringLabels[0]).toBe('1弦')
    expect(stringLabels[stringLabels.length - 1]).toBe('6弦')
  })

  it('allows direct manual fret selection from the editor panel', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Manual start fret'), {
      target: { value: '5' },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: '6弦 5フレット',
      }),
    )

    expect(
      screen.getByRole('button', {
        name: '6弦 5フレット',
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    const bassInfo = screen.getByText('ベース音').closest('div')

    expect(bassInfo).toHaveTextContent('A')
  })

  it('keeps editing the current chord after selecting a layout block', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Root note'), {
      target: { value: 'A' },
    })
    fireEvent.change(screen.getByLabelText('Chord quality'), {
      target: { value: 'minor' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Select E block',
      }),
    )

    expect(
      screen.getByRole('button', {
        name: '選択コードを編集',
      }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getAllByRole('heading', {
        name: 'Am',
      })[0],
    ).toBeInTheDocument()
  })

  it('updates a selected layout block only after explicit edit mode is enabled', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Select E block',
      }),
    )
    fireEvent.change(screen.getByLabelText('Root note'), {
      target: { value: 'A' },
    })
    fireEvent.change(screen.getByLabelText('Chord quality'), {
      target: { value: 'minor' },
    })

    expect(
      screen.getByRole('button', {
        name: 'Select E block',
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: '選択コードを編集',
      }),
    )
    fireEvent.change(screen.getByLabelText('Chord quality'), {
      target: { value: 'major' },
    })

    expect(
      screen.getByRole('button', {
        name: 'Select A block',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: '選択コードの編集を終了',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the selected layout block name while edit mode is active', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '選択コードを編集',
      }),
    )
    fireEvent.change(screen.getByLabelText('Chord name'), {
      target: { value: 'Intro E' },
    })

    expect(
      screen.getByRole('button', {
        name: 'Select Intro E block',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Intro E を編集中')).toBeInTheDocument()
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

      fireEvent.change(screen.getByLabelText('Lyrics line 1'), {
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
    const fakeContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => fakeContext)

    exportCanvas.width = 1200
    exportCanvas.height = 1600
    pdfMocks.html2canvas.mockResolvedValue(exportCanvas)

    try {
      const { container } = render(<App />)

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

      expect(pdfInstance?.addImage).toHaveBeenCalled()
      expect(pdfInstance?.addPage).toHaveBeenCalledTimes(1)
      expect(pdfInstance?.save).toHaveBeenCalledWith('chordcanvas-layout.pdf', {
        returnPromise: true,
      })
      expect(layoutStage).not.toHaveAttribute('data-exporting-pdf')
      expect(screen.getByRole('status')).toHaveTextContent(
        'chordcanvas-layout.pdf を書き出しました。',
      )
    } finally {
      getContextSpy.mockRestore()
    }
  })

  it('imports a saved project JSON', async () => {
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
      expect(screen.getByLabelText('Lyrics line 2')).toHaveValue('Bridge line')
    })

    expect(
      screen.getAllByRole('button', {
        name: /^Select .* block$/,
      }),
    ).toHaveLength(2)
    expect(screen.getByLabelText('Block row')).toHaveValue('row-18')
    expect(screen.getByLabelText('Block horizontal offset')).toHaveValue(5)
    expect(screen.getByLabelText('Block spacing')).toHaveValue(48)
    expect(screen.getByLabelText('Manual start fret')).toHaveValue(5)
    expect(screen.getByLabelText('Manual fret count')).toHaveValue(5)
    expect(screen.getByLabelText('Chord name')).toHaveValue('Verse Am')
    expect(
      screen.getByRole('button', {
        name: 'Select Bridge F block',
      }),
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('region', {
          name: 'コードストック',
        }),
      ).getByRole('heading', {
        name: 'Stock Am',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'saved-project.json を読み込みました。',
    )
  })
})

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { toFretting } from './music/chords'
import {
  serializeProjectFile,
  type ProjectSnapshot,
} from './project/projectFile'

afterEach(() => {
  cleanup()
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
        name: 'レイアウト編集',
      }),
    ).toBeInTheDocument()
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

  it('shows the layout block name only once', () => {
    render(<App />)

    const layoutButton = screen.getByRole('button', {
      name: 'Select E block',
    })

    expect(within(layoutButton).getAllByText('E')).toHaveLength(1)
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

  it('keeps a single unified fretting editor', () => {
    render(<App />)

    expect(
      screen.getAllByRole('group', {
        name: 'Fretting editor',
      }),
    ).toHaveLength(1)
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
      expect(projectDocument.state.layoutRows[0].lyrics).toBe('Exported line')
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

  it('imports a saved project JSON', async () => {
    const importedSnapshot: ProjectSnapshot = {
      selectedRoot: 'A',
      selectedQuality: 'minor',
      selectedFormId: 'open-a-minor',
      layoutRows: [
        { id: 'row-12', lyrics: 'Verse line' },
        { id: 'row-18', lyrics: 'Bridge line' },
      ],
      blocks: [
        {
          id: 'chord-40',
          fretting: toFretting(['x', 0, 2, 2, 1, 0]),
          xOffset: 12,
          spacing: 24,
          rowId: 'row-12',
        },
        {
          id: 'chord-41',
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
    expect(screen.getByLabelText('Manual fret count')).toHaveValue(4)
    expect(screen.getByRole('status')).toHaveTextContent(
      'saved-project.json を読み込みました。',
    )
  })
})

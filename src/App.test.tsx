import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

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
})

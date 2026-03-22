import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deriveViewport, summarizeChord, toFretting } from '../music/chords'
import ChordDiagram from './ChordDiagram'

describe('ChordDiagram', () => {
  it('renders strings horizontally so the head side is on the left', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])
    const viewport = deriveViewport(fretting)
    const { container } = render(
      <ChordDiagram
        fretting={fretting}
        markerLabels={summarizeChord(fretting).stringDegreeLabels}
        title="C"
        viewport={viewport}
      />,
    )

    const stringLines = [...container.querySelectorAll('line.diagram-string')]

    expect(stringLines).toHaveLength(6)
    stringLines.forEach((line) => {
      expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'))
    })
  })

  it('renders the first string on the top side of the diagram', () => {
    const fretting = toFretting([1, 2, 3, 4, 5, 6])
    const viewport = deriveViewport(fretting)
    const { container } = render(
      <ChordDiagram
        fretting={fretting}
        markerLabels={['A', 'B', 'C', 'D', 'E', 'F']}
        viewport={viewport}
      />,
    )

    const markerTexts = [
      ...container.querySelectorAll<SVGTextElement>('text.diagram-marker-text'),
    ]
      .map((text) => ({
        value: text.textContent,
        y: Number.parseFloat(text.getAttribute('y') ?? '0'),
      }))
      .sort((left, right) => left.y - right.y)

    expect(markerTexts[0]?.value).toBe('F')
    expect(markerTexts[markerTexts.length - 1]?.value).toBe('A')
  })

  it('uses a tighter compact viewBox for layout rendering', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])
    const viewport = deriveViewport(fretting)
    const { container } = render(
      <ChordDiagram
        compact
        fretting={fretting}
        markerLabels={summarizeChord(fretting).stringDegreeLabels}
        viewport={viewport}
      />,
    )

    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 154 130',
    )
  })

  it('does not render a separate start fret label', () => {
    const fretting = toFretting([10, 12, 12, 11, 10, 10])
    const viewport = deriveViewport(fretting)
    const { container } = render(
      <ChordDiagram
        fretting={fretting}
        markerLabels={['R', '5', 'R', '3', '5', 'R']}
        viewport={viewport}
      />,
    )

    expect(viewport.isNutPosition).toBe(false)
    expect(container.querySelector('.diagram-start-fret')).toBeNull()
    expect(container).not.toHaveTextContent('10fr')
  })

  it('renders derived degree labels instead of fret numbers', () => {
    const fretting = toFretting([0, 2, 2, 1, 0, 2])
    const summary = summarizeChord(fretting)
    const { container } = render(
      <ChordDiagram
        fretting={fretting}
        markerLabels={summary.stringDegreeLabels}
        viewport={summary.viewport}
      />,
    )

    const markerTexts = [
      ...container.querySelectorAll<SVGTextElement>('text.diagram-marker-text'),
    ].map((text) => text.textContent)

    expect(markerTexts).toEqual(['5', 'R', '3', '9'])
  })
})

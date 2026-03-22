import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deriveViewport, toFretting } from '../music/chords'
import ChordDiagram from './ChordDiagram'

describe('ChordDiagram', () => {
  it('renders strings horizontally so the head side is on the left', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])
    const viewport = deriveViewport(fretting)
    const { container } = render(
      <ChordDiagram fretting={fretting} title="C" viewport={viewport} />,
    )

    const stringLines = [...container.querySelectorAll('line.diagram-string')]

    expect(stringLines).toHaveLength(6)
    stringLines.forEach((line) => {
      expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'))
    })
  })

  it('uses a tighter compact viewBox for layout rendering', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])
    const viewport = deriveViewport(fretting)
    const { container } = render(
      <ChordDiagram compact fretting={fretting} viewport={viewport} />,
    )

    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 122 130',
    )
  })
})

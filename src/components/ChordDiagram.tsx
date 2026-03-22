import {
  type DiagramViewport,
  type Fretting,
  type StringState,
  isMuted,
  isOpen,
} from '../music/chords'

interface ChordDiagramProps {
  fretting: Fretting
  markerLabels: readonly (string | null)[]
  viewport: DiagramViewport
  title?: string
  compact?: boolean
  pdfExport?: boolean
}

function getMarkerX(
  state: StringState,
  viewport: DiagramViewport,
  gridLeft: number,
  fretSpacing: number,
): number | null {
  if (typeof state !== 'number' || state === 0) {
    return null
  }

  return gridLeft + (state - viewport.startFret + 0.5) * fretSpacing
}

function ChordDiagram({
  fretting,
  markerLabels,
  viewport,
  title,
  compact = false,
  pdfExport = false,
}: ChordDiagramProps) {
  const isPdfCompact = compact && pdfExport
  const fretSpacing = isPdfCompact ? 20 : compact ? 22 : 32
  const stringSpacing = isPdfCompact ? 13 : compact ? 16 : 20
  const gridLeft = compact ? 34 : 52
  const gridTop = isPdfCompact ? 20 : compact ? 36 : 56
  const gridWidth = viewport.fretCount * fretSpacing
  const gridRight = gridLeft + gridWidth
  const stringYs = Array.from(
    { length: 6 },
    (_, index) => gridTop + index * stringSpacing,
  )
  const topStringY = stringYs[0] ?? gridTop
  const bottomStringY = stringYs[stringYs.length - 1] ?? gridTop
  const width = gridRight + (isPdfCompact ? 10 : compact ? 10 : 18)
  const height = bottomStringY + (isPdfCompact ? 7 : compact ? 14 : 26)
  const fretLabelY = gridTop - (isPdfCompact ? 6 : compact ? 8 : 14)
  const statusLabelX = gridLeft - (compact ? 16 : 22)
  const lastStringIndex = stringYs.length - 1

  function getStringY(stringIndex: number): number | undefined {
    return stringYs[lastStringIndex - stringIndex]
  }

  return (
    <svg
      aria-label={title ?? 'Chord diagram'}
      className={`chord-diagram${compact ? ' compact' : ''}`}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      {title ? (
        <text className="diagram-title" x="12" y="16">
          {title}
        </text>
      ) : null}

      {stringYs.map((y) => (
        <line
          className="diagram-string"
          key={`string-${y}`}
          x1={gridLeft}
          x2={gridRight}
          y1={y}
          y2={y}
        />
      ))}

      {Array.from({ length: viewport.fretCount + 1 }, (_, index) => {
        const x = gridLeft + index * fretSpacing

        return (
          <line
            className={`diagram-fret${
              index === 0 && viewport.isNutPosition ? ' nut' : ''
            }`}
            key={`fret-${x}`}
            x1={x}
            x2={x}
            y1={topStringY}
            y2={bottomStringY}
          />
        )
      })}

      {viewport.visibleFrets.map((fret, index) => {
        const x = gridLeft + index * fretSpacing + fretSpacing / 2

        return (
          <text
            className="diagram-fret-label"
            key={`fret-label-${fret}`}
            textAnchor="middle"
            x={x}
            y={fretLabelY}
          >
            {fret}
          </text>
        )
      })}

      {fretting.map((state, stringIndex) => {
        const y = getStringY(stringIndex)

        if (y === undefined) {
          return null
        }

        if (isMuted(state)) {
          return (
            <text
              className="diagram-top-label"
              key={`muted-${stringIndex}`}
              x={statusLabelX}
              y={y}
            >
              X
            </text>
          )
        }

        if (isOpen(state)) {
          return (
            <text
              className="diagram-top-label"
              key={`open-${stringIndex}`}
              x={statusLabelX}
              y={y}
            >
              O
            </text>
          )
        }

        const markerX = getMarkerX(state, viewport, gridLeft, fretSpacing)

        if (!markerX) {
          return null
        }

        return (
          <g key={`marker-${stringIndex}`}>
            <circle
              className="diagram-marker"
              cx={markerX}
              cy={y}
              r={isPdfCompact ? 6.2 : compact ? 7 : 8.5}
            />
            {markerLabels[stringIndex] ? (
              <text className="diagram-marker-text" x={markerX} y={y + 1}>
                {markerLabels[stringIndex]}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

export default ChordDiagram

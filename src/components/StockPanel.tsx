import { useEffect, useRef, useState } from 'react'
import ChordDiagram from './ChordDiagram'
import PlayChordButton from './PlayChordButton'
import type { StockEntryViewModel } from './viewModels'
import type { UiText } from '../uiText'

interface StockPanelProps {
  onAddStockChordToLayout: (stockChordId: string) => void
  showStockAddHint: boolean
  stockEntries: readonly StockEntryViewModel[]
  text: UiText
  onOpenStockModal: () => void
  onPlayStockChord: (stockChordId: string) => void
  onRemoveStockChord: (stockChordId: string) => void
  onStockAddHintHide: () => void
  onStockAddHintSchedule: () => void
  onStockAddHintShowImmediately: () => void
}

function StockPanel({
  onAddStockChordToLayout,
  showStockAddHint,
  stockEntries,
  text,
  onOpenStockModal,
  onPlayStockChord,
  onRemoveStockChord,
  onStockAddHintHide,
  onStockAddHintSchedule,
  onStockAddHintShowImmediately,
}: StockPanelProps) {
  const [revealedStockChordId, setRevealedStockChordId] = useState<
    string | null
  >(null)
  const stockPanelRef = useRef<HTMLElement | null>(null)
  const activeRevealedStockChordId =
    revealedStockChordId &&
    stockEntries.some(
      ({ stockChord }) => stockChord.id === revealedStockChordId,
    )
      ? revealedStockChordId
      : null

  useEffect(() => {
    if (!activeRevealedStockChordId) {
      return
    }

    function handleWindowPointerDown(event: PointerEvent) {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      const activeCard = stockPanelRef.current?.querySelector<HTMLElement>(
        `[data-stock-card-id="${activeRevealedStockChordId}"]`,
      )

      if (activeCard?.contains(target)) {
        return
      }

      setRevealedStockChordId(null)
    }

    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setRevealedStockChordId(null)
      }
    }

    window.addEventListener('pointerdown', handleWindowPointerDown)
    window.addEventListener('keydown', handleWindowKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown)
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [activeRevealedStockChordId])

  function toggleStockChordActions(stockChordId: string) {
    setRevealedStockChordId((currentId) =>
      currentId === stockChordId ? null : stockChordId,
    )
  }

  function handleRemoveStockChord(stockChordId: string) {
    setRevealedStockChordId((currentId) =>
      currentId === stockChordId ? null : currentId,
    )
    onRemoveStockChord(stockChordId)
  }

  function renderStockAddButton(className: string) {
    return (
      <div className="stock-add-button-wrapper">
        <button
          aria-label={text.openStockAddModal}
          className={className}
          onBlur={onStockAddHintHide}
          onClick={onOpenStockModal}
          onFocus={onStockAddHintShowImmediately}
          onMouseEnter={onStockAddHintSchedule}
          onMouseLeave={onStockAddHintHide}
          type="button"
        >
          +
        </button>
        {showStockAddHint ? (
          <div
            aria-hidden="true"
            className="layout-block-hover-hint stock-add-tooltip"
          >
            {text.stockAddTooltip}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <section
      aria-labelledby="stock-heading"
      className="panel stock-panel"
      ref={stockPanelRef}
    >
      <div className="panel-heading stock-panel-heading">
        <h2 id="stock-heading">{text.stockHeading}</h2>
      </div>

      {stockEntries.length > 0 ? (
        <div className="stock-grid">
          {stockEntries.map(({ stockChord, summary, displayName }) => {
            const isActionButtonsVisible =
              stockChord.id === activeRevealedStockChordId
            const headingId = `stock-card-name-${stockChord.id}`
            const toggleHintId = `stock-card-toggle-${stockChord.id}`

            return (
              <article
                className="stock-card dismissible-card"
                data-revealed={isActionButtonsVisible ? 'true' : undefined}
                data-stock-card-id={stockChord.id}
                key={stockChord.id}
              >
                <span className="visually-hidden" id={toggleHintId}>
                  {text.stockCardToggleDescription(isActionButtonsVisible)}
                </span>
                {isActionButtonsVisible ? (
                  <button
                    aria-label={text.addStockChordToLayoutAria(displayName)}
                    className="accent-button stock-card-add-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onAddStockChordToLayout(stockChord.id)
                    }}
                    type="button"
                  >
                    {text.addToRow}
                  </button>
                ) : null}
                {isActionButtonsVisible ? (
                  <button
                    aria-label={text.removeStockChordAria(displayName)}
                    className="card-dismiss-button stock-card-dismiss-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRemoveStockChord(stockChord.id)
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                ) : null}
                {isActionButtonsVisible ? (
                  <PlayChordButton
                    ariaLabel={text.playChordAria(displayName)}
                    className="stock-card-play-button"
                    onClick={() => onPlayStockChord(stockChord.id)}
                  />
                ) : null}
                <button
                  aria-describedby={toggleHintId}
                  aria-expanded={isActionButtonsVisible}
                  aria-labelledby={headingId}
                  className="stock-card-toggle-button"
                  onClick={() => toggleStockChordActions(stockChord.id)}
                  type="button"
                />
                <div className="chord-preview-block stock-chord-preview">
                  <h3 className="chord-preview-name" id={headingId}>
                    {displayName}
                  </h3>
                  <ChordDiagram
                    compact
                    fretting={stockChord.fretting}
                    markerLabels={summary.stringDegreeLabels}
                    tightTopSpacing
                    viewport={summary.viewport}
                  />
                </div>
              </article>
            )
          })}
          {renderStockAddButton('card-add-button stock-add-button')}
        </div>
      ) : (
        <div className="stock-empty-state">
          {renderStockAddButton(
            'card-add-button stock-add-button stock-add-button-empty',
          )}
          <p className="stock-empty">{text.stockEmpty}</p>
        </div>
      )}
    </section>
  )
}

export default StockPanel

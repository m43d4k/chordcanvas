import ChordDiagram from './ChordDiagram'
import type { StockEntryViewModel } from './viewModels'
import type { UiText } from '../uiText'

interface StockPanelProps {
  showStockAddHint: boolean
  stockEntries: readonly StockEntryViewModel[]
  text: UiText
  onOpenStockModal: () => void
  onRemoveStockChord: (stockChordId: string) => void
  onStockAddHintHide: () => void
  onStockAddHintSchedule: () => void
  onStockAddHintShowImmediately: () => void
}

function StockPanel({
  showStockAddHint,
  stockEntries,
  text,
  onOpenStockModal,
  onRemoveStockChord,
  onStockAddHintHide,
  onStockAddHintSchedule,
  onStockAddHintShowImmediately,
}: StockPanelProps) {
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
    <section className="panel stock-panel" aria-labelledby="stock-heading">
      <div className="panel-heading stock-panel-heading">
        <h2 id="stock-heading">{text.stockHeading}</h2>
      </div>

      {stockEntries.length > 0 ? (
        <div className="stock-grid">
          {stockEntries.map(({ stockChord, summary, displayName }) => (
            <article className="stock-card dismissible-card" key={stockChord.id}>
              <button
                aria-label={text.removeStockChordAria(displayName)}
                className="card-dismiss-button"
                onClick={() => onRemoveStockChord(stockChord.id)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
              <div className="chord-preview-block stock-chord-preview">
                <h3 className="chord-preview-name">{displayName}</h3>
                <ChordDiagram
                  compact
                  fretting={stockChord.fretting}
                  markerLabels={summary.stringDegreeLabels}
                  tightTopSpacing
                  viewport={summary.viewport}
                />
              </div>
            </article>
          ))}
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

import ChordDiagram from './ChordDiagram'
import ChordComposer, { type ManualStringEntry } from './ChordComposer'
import type {
  ChordForm,
  ChordSummary,
  ChordQuality,
  Fretting,
  PitchClassName,
  StringState,
} from '../music/chords'
import type { StockEntryViewModel } from './viewModels'
import type { UiText } from '../uiText'
import type { ChangeEvent, FormEvent } from 'react'

interface ChordModalProps {
  chordModalKind: 'stock' | 'layout' | 'edit'
  displayName: string
  isModalChordStocked: boolean
  isModalDraftStocked: boolean
  manualFretCount: number
  manualGridTemplate: string
  manualStartFret: number
  manualStringEntries: readonly ManualStringEntry[]
  manualVisibleFrets: readonly number[]
  maxManualFretCount: number
  minManualFretCount: number
  selectedBlockDisplayName: string
  selectedFormId: string
  selectedQuality: ChordQuality
  selectedRoot: PitchClassName
  stockEntries: readonly StockEntryViewModel[]
  submitLabel: string
  summary: ChordSummary
  text: UiText
  title: string
  valueChordName: string
  valueFretting: Fretting
  availableForms: readonly ChordForm[]
  onAddChordDraftToStock: () => void
  onAddStockChordFromModal: (stockChordId: string) => void
  onChordNameChange: (event: ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
  onFormChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onManualFretCountChange: (event: ChangeEvent<HTMLInputElement>) => void
  onManualStartFretChange: (event: ChangeEvent<HTMLInputElement>) => void
  onPlayChord: () => void
  onQualityChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onRootChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onStringStateChange: (stringIndex: number, nextState: StringState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onViewportSync: () => void
}

function ChordModal({
  chordModalKind,
  displayName,
  isModalChordStocked,
  isModalDraftStocked,
  manualFretCount,
  manualGridTemplate,
  manualStartFret,
  manualStringEntries,
  manualVisibleFrets,
  maxManualFretCount,
  minManualFretCount,
  selectedBlockDisplayName,
  selectedFormId,
  selectedQuality,
  selectedRoot,
  stockEntries,
  submitLabel,
  summary,
  text,
  title,
  valueChordName,
  valueFretting,
  availableForms,
  onAddChordDraftToStock,
  onAddStockChordFromModal,
  onChordNameChange,
  onClose,
  onFormChange,
  onManualFretCountChange,
  onManualStartFretChange,
  onPlayChord,
  onQualityChange,
  onRootChange,
  onStringStateChange,
  onSubmit,
  onViewportSync,
}: ChordModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        aria-labelledby="chord-modal-heading"
        aria-modal="true"
        className="chord-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="chord-modal-header">
          <div>
            {chordModalKind === 'edit' ? (
              <p className="meta-label">{text.editSelectedChord}</p>
            ) : null}
            <h2 id="chord-modal-heading">{title}</h2>
            {chordModalKind === 'edit' ? (
              <p className="meta-note">
                {text.editingBlockNotice(selectedBlockDisplayName)}
              </p>
            ) : null}
          </div>
          <button
            aria-label={text.modalClose}
            className="panel-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="chord-modal-form" onSubmit={onSubmit}>
          <ChordComposer
            availableForms={availableForms}
            chordName={valueChordName}
            displayName={displayName}
            fretting={valueFretting}
            manualFretCount={manualFretCount}
            manualGridTemplate={manualGridTemplate}
            manualStartFret={manualStartFret}
            manualStringEntries={manualStringEntries}
            manualVisibleFrets={manualVisibleFrets}
            maxManualFretCount={maxManualFretCount}
            minManualFretCount={minManualFretCount}
            onChordNameChange={onChordNameChange}
            onFormChange={onFormChange}
            onManualFretCountChange={onManualFretCountChange}
            onManualStartFretChange={onManualStartFretChange}
            onPlayChord={onPlayChord}
            onQualityChange={onQualityChange}
            onRootChange={onRootChange}
            onStringStateChange={onStringStateChange}
            onViewportSync={onViewportSync}
            selectedFormId={selectedFormId}
            selectedQuality={selectedQuality}
            selectedRoot={selectedRoot}
            summary={summary}
            text={text}
          />

          {chordModalKind === 'layout' ? (
            <>
              <div className="modal-actions modal-layout-actions">
                <button
                  className="accent-button modal-submit-button"
                  type="submit"
                >
                  {submitLabel}
                </button>
                <button
                  className="accent-button modal-submit-button"
                  disabled={isModalDraftStocked}
                  onClick={onAddChordDraftToStock}
                  type="button"
                >
                  {isModalDraftStocked
                    ? text.alreadyStockedButton
                    : text.addToStock}
                </button>
              </div>

              <section
                aria-labelledby="modal-stock-heading"
                className="composer-section modal-stock-section"
              >
                <div className="panel-heading">
                  <h2 id="modal-stock-heading">{text.stockHeading}</h2>
                </div>

                {stockEntries.length > 0 ? (
                  <div className="stock-grid modal-stock-grid">
                    {stockEntries.map(
                      ({ stockChord, summary, displayName }) => (
                        <article className="stock-card" key={stockChord.id}>
                          <div className="chord-preview-block stock-chord-preview">
                            <h3 className="chord-preview-name">
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

                          <div className="stock-card-actions">
                            <button
                              onClick={() =>
                                onAddStockChordFromModal(stockChord.id)
                              }
                              type="button"
                            >
                              {text.addToRow}
                            </button>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="stock-empty">{text.stockEmpty}</p>
                )}
              </section>
            </>
          ) : null}

          {chordModalKind !== 'layout' ? (
            <div className="modal-actions">
              <button
                className="accent-button modal-submit-button"
                disabled={chordModalKind === 'stock' && isModalChordStocked}
                type="submit"
              >
                {submitLabel}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
}

export default ChordModal

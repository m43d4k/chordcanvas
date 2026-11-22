import {
  useId,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import AudioMuteButton from './AudioMuteButton'
import ChordDiagram from './ChordDiagram'
import ChordComposer, { type ManualStringEntry } from './ChordComposer'
import type {
  ChordSummary,
  ChordQuality,
  Fretting,
  PitchClassName,
  PlayedNote,
  StringState,
} from '../music/chords'
import type { StockEntryViewModel } from './viewModels'
import type { UiText } from '../uiText'

interface ChordModalProps {
  chordModalKind: 'stock' | 'layout' | 'edit'
  displayName: string
  isAudioMuted: boolean
  isModalChordStocked: boolean
  isModalDraftStocked: boolean
  isSingleNote: boolean
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
  onAddChordDraftToStock: () => void
  onAddStockChordFromModal: (stockChordId: string) => void
  onChordNameChange: (event: ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
  onFormChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onManualFretCountChange: (event: ChangeEvent<HTMLInputElement>) => void
  onManualStartFretChange: (event: ChangeEvent<HTMLInputElement>) => void
  onModeChange: (isSingleNote: boolean) => void
  onNoteChange: (note: PitchClassName) => void
  onNotePositionChange: (position: PlayedNote) => void
  onPlayChord: () => void
  onQualityChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onRootChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onStringStateChange: (stringIndex: number, nextState: StringState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onToggleAudioMute: () => void
  onViewportSync: () => void
}

function ChordModal({
  chordModalKind,
  displayName,
  isAudioMuted,
  isModalChordStocked,
  isModalDraftStocked,
  isSingleNote,
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
  onAddChordDraftToStock,
  onAddStockChordFromModal,
  onChordNameChange,
  onClose,
  onFormChange,
  onManualFretCountChange,
  onManualStartFretChange,
  onModeChange,
  onNoteChange,
  onNotePositionChange,
  onPlayChord,
  onQualityChange,
  onRootChange,
  onStringStateChange,
  onSubmit,
  onToggleAudioMute,
  onViewportSync,
}: ChordModalProps) {
  const modeId = useId()
  const chordTabRef = useRef<HTMLButtonElement>(null)
  const noteTabRef = useRef<HTMLButtonElement>(null)
  const hasModeTabs = chordModalKind === 'layout'
  const activeMode = isSingleNote ? 'note' : 'chord'
  const inactiveMode = isSingleNote ? 'chord' : 'note'
  const alreadyStockedLabel = isSingleNote
    ? text.alreadyStockedNoteButton
    : text.alreadyStockedButton

  function handleModeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let selectNote: boolean
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        selectNote = !isSingleNote
        break
      case 'Home':
        selectNote = false
        break
      case 'End':
        selectNote = true
        break
      default:
        return
    }

    event.preventDefault()
    onModeChange(selectNote)
    const nextTabRef = selectNote ? noteTabRef : chordTabRef
    nextTabRef.current?.focus()
  }

  const composer = (
    <ChordComposer
      chordName={valueChordName}
      displayName={displayName}
      fretting={valueFretting}
      isAudioMuted={isAudioMuted}
      isSingleNote={isSingleNote}
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
      onNoteChange={onNoteChange}
      onNotePositionChange={onNotePositionChange}
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
  )

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
          <div className="chord-modal-header-actions">
            <AudioMuteButton
              isMuted={isAudioMuted}
              onToggle={onToggleAudioMute}
              text={text}
            />
            <button
              aria-label={text.modalClose}
              className="panel-icon-button"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        <form className="chord-modal-form" onSubmit={onSubmit}>
          {hasModeTabs ? (
            <>
              <div
                aria-label={text.diagramMode}
                className="composer-mode-tabs"
                onKeyDown={handleModeKeyDown}
                role="tablist"
              >
                {(['chord', 'note'] as const).map((mode) => (
                  <button
                    aria-controls={`${modeId}-panel-${mode}`}
                    aria-selected={activeMode === mode}
                    className="secondary-button"
                    id={`${modeId}-tab-${mode}`}
                    key={mode}
                    onClick={() => onModeChange(mode === 'note')}
                    ref={mode === 'note' ? noteTabRef : chordTabRef}
                    role="tab"
                    tabIndex={activeMode === mode ? 0 : -1}
                    type="button"
                  >
                    {mode === 'note' ? text.singleNoteMode : text.chordMode}
                  </button>
                ))}
              </div>
              <div
                aria-labelledby={`${modeId}-tab-${activeMode}`}
                className="composer-mode-panel"
                id={`${modeId}-panel-${activeMode}`}
                role="tabpanel"
              >
                {composer}
              </div>
              <div
                aria-labelledby={`${modeId}-tab-${inactiveMode}`}
                hidden
                id={`${modeId}-panel-${inactiveMode}`}
                role="tabpanel"
              />
            </>
          ) : (
            composer
          )}

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
                  {isModalDraftStocked ? alreadyStockedLabel : text.addToStock}
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

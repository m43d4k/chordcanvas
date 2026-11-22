import { useState, type CSSProperties, type ChangeEvent } from 'react'
import type {
  ChordQuality,
  ChordSummary,
  Fretting,
  PitchClassName,
  StringState,
} from '../music/chords'
import {
  CHORD_QUALITIES,
  BASIC_QUALITIES,
  buildChordLabel,
  chartRootName,
  frettingToKey,
  getChordForms,
  spellChordNote,
  PITCH_CLASSES,
  deriveNoteNameAtPosition,
} from '../music/chords'
import type { UiText } from '../uiText'
import ChordDiagram from './ChordDiagram'
import PlayChordButton from './PlayChordButton'

export interface ManualStringEntry {
  state: StringState
  stringIndex: number
  stringNumber: number
}

interface ChordComposerProps {
  text: UiText
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  fretting: Fretting
  summary: ChordSummary
  displayName: string
  chordName: string
  manualStartFret: number
  manualFretCount: number
  minManualFretCount: number
  maxManualFretCount: number
  manualVisibleFrets: readonly number[]
  manualGridTemplate: string
  manualStringEntries: readonly ManualStringEntry[]
  onPlayChord: () => void
  onRootChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onQualityChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onFormChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onChordNameChange: (event: ChangeEvent<HTMLInputElement>) => void
  onViewportSync: () => void
  onManualStartFretChange: (event: ChangeEvent<HTMLInputElement>) => void
  onManualFretCountChange: (event: ChangeEvent<HTMLInputElement>) => void
  onStringStateChange: (stringIndex: number, nextState: StringState) => void
}

function ChordComposer({
  text,
  selectedRoot,
  selectedQuality,
  selectedFormId,
  fretting,
  summary,
  displayName,
  chordName,
  manualStartFret,
  manualFretCount,
  minManualFretCount,
  maxManualFretCount,
  manualVisibleFrets,
  manualGridTemplate,
  manualStringEntries,
  onPlayChord,
  onRootChange,
  onQualityChange,
  onFormChange,
  onChordNameChange,
  onViewportSync,
  onManualStartFretChange,
  onManualFretCountChange,
  onStringStateChange,
}: ChordComposerProps) {
  const [showNoteNames, setShowNoteNames] = useState(false)
  const [showAdvancedCandidates, setShowAdvancedCandidates] = useState(false)
  const [showGenerated, setShowGenerated] = useState(
    selectedFormId.startsWith('generated-'),
  )
  const availableForms = getChordForms(
    selectedRoot,
    selectedQuality,
    showGenerated,
  )
  const frettingKey = frettingToKey(fretting)
  const currentForm = availableForms.find(
    (form) => frettingToKey(form.fretting) === frettingKey,
  )
  const candidate = summary.candidates[0]
  function displayNote(note: PitchClassName) {
    return candidate
      ? spellChordNote(candidate.root, candidate.quality, note)
      : chartRootName(note)
  }
  function fretButtonLabel(stringIndex: number, fret: number) {
    if (!showNoteNames) return fret
    const note = deriveNoteNameAtPosition(stringIndex, fret)
    return note ? displayNote(note) : fret
  }
  const manualGridStyle = {
    '--manual-grid-column-count': manualVisibleFrets.length + 3,
  } as CSSProperties
  const manualGridRowStyle = {
    gridTemplateColumns: manualGridTemplate,
  } as CSSProperties

  return (
    <div className="composer-sections">
      <section
        className="composer-section composer-generator-section"
        aria-labelledby="modal-generator-heading"
      >
        <div className="panel-heading">
          <h2 id="modal-generator-heading">{text.generatorHeading}</h2>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>{text.rootNote}</span>
            <select
              aria-label={text.rootNote}
              onChange={onRootChange}
              value={selectedRoot}
            >
              {PITCH_CLASSES.map((pitchClass) => (
                <option key={pitchClass} value={pitchClass}>
                  {chartRootName(pitchClass)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{text.chordQuality}</span>
            <select
              aria-label={text.chordQuality}
              onChange={onQualityChange}
              value={selectedQuality}
            >
              {[
                { label: text.commonChords, qualities: BASIC_QUALITIES },
                {
                  label: text.otherChords,
                  qualities: CHORD_QUALITIES.filter(
                    (quality) => !BASIC_QUALITIES.includes(quality),
                  ),
                },
              ].map(({ label, qualities }) => (
                <optgroup key={label} label={label}>
                  {qualities.map((quality) => (
                    <option key={quality} value={quality}>
                      {buildChordLabel(selectedRoot, quality)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{text.chordForm}</span>
            <select
              aria-label={text.chordForm}
              onChange={onFormChange}
              value={currentForm?.id ?? ''}
            >
              {!currentForm && (
                <option value="" disabled>
                  {text.customFretting}
                </option>
              )}
              {availableForms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.label} · {form.fretting.join('-')}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="candidate-toggle">
          <input
            type="checkbox"
            checked={showGenerated}
            onChange={(event) => setShowGenerated(event.target.checked)}
          />
          {text.includeGeneratedForms}
        </label>
      </section>

      <div className="composer-editor-layout">
        <section
          className="composer-section composer-editor-section"
          aria-labelledby="modal-editor-heading"
        >
          <div className="panel-heading">
            <h2 id="modal-editor-heading">{text.editorHeading}</h2>
          </div>

          <div className="editor-content modal-editor-content">
            <div className="diagram-card">
              <div className="diagram-card-header">
                <div>
                  <h3>{displayName}</h3>
                  <label className="field small diagram-name-field">
                    <span>{text.displayChordName}</span>
                    <input
                      aria-label={text.displayChordName}
                      onChange={onChordNameChange}
                      placeholder={summary.currentName}
                      type="text"
                      value={chordName}
                    />
                  </label>
                  <p className="meta-note">{text.useAutoDetectedName}</p>
                </div>
              </div>

              <div className="diagram-preview-frame">
                <ChordDiagram
                  fretting={fretting}
                  markerLabels={summary.stringDegreeLabels}
                  viewport={summary.viewport}
                />
                <PlayChordButton
                  ariaLabel={text.playChordAria(displayName)}
                  className="diagram-play-button"
                  onClick={onPlayChord}
                />
              </div>
            </div>

            <div className="manual-builder">
              <div className="manual-builder-header">
                <div>
                  <h3>{text.frettingInput}</h3>
                </div>
                <div className="manual-builder-actions">
                  <button
                    aria-pressed={showNoteNames}
                    className="secondary-button"
                    onClick={() => setShowNoteNames((current) => !current)}
                    type="button"
                  >
                    {text.toggleNoteNames}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={onViewportSync}
                    type="button"
                  >
                    {text.autoAdjustViewport}
                  </button>
                </div>
              </div>

              <div className="manual-settings">
                <label className="field small">
                  <span>{text.startFret}</span>
                  <input
                    aria-label={text.startFret}
                    min="1"
                    onChange={onManualStartFretChange}
                    type="number"
                    value={manualStartFret}
                  />
                </label>

                <label className="field small">
                  <span>{text.visibleFretCount}</span>
                  <input
                    aria-label={text.visibleFretCount}
                    max={maxManualFretCount}
                    min={minManualFretCount}
                    onChange={onManualFretCountChange}
                    type="number"
                    value={manualFretCount}
                  />
                </label>
              </div>

              <div
                aria-label={text.frettingInput}
                className="manual-grid"
                role="group"
                style={manualGridStyle}
              >
                {manualStringEntries.map(
                  ({ state, stringIndex, stringNumber }) => (
                    <div
                      className="manual-grid-row"
                      key={`manual-row-${stringIndex}`}
                      style={manualGridRowStyle}
                    >
                      <span className="manual-grid-string">
                        {text.stringLabel(stringNumber)}
                      </span>
                      <button
                        aria-label={text.stringMuteLabel(stringNumber)}
                        aria-pressed={state === 'x'}
                        className={state === 'x' ? 'active' : ''}
                        onClick={() => onStringStateChange(stringIndex, 'x')}
                        type="button"
                      >
                        X
                      </button>
                      <button
                        aria-label={text.stringOpenLabel(stringNumber)}
                        aria-pressed={state === 0}
                        className={state === 0 ? 'active' : ''}
                        onClick={() => onStringStateChange(stringIndex, 0)}
                        type="button"
                      >
                        O
                      </button>
                      {manualVisibleFrets.map((fret) => (
                        <button
                          aria-label={text.stringFretLabel(stringNumber, fret)}
                          aria-pressed={state === fret}
                          className={state === fret ? 'active' : ''}
                          key={`manual-string-${stringIndex}-fret-${fret}`}
                          onClick={() => onStringStateChange(stringIndex, fret)}
                          type="button"
                        >
                          {fretButtonLabel(stringIndex, fret)}
                        </button>
                      ))}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className="composer-section composer-info-section"
          aria-labelledby="modal-info-heading"
        >
          <div className="panel-heading">
            <h2 id="modal-info-heading">{text.infoHeading}</h2>
          </div>

          <dl className="info-list">
            <div>
              <dt>{text.currentChordName}</dt>
              <dd>{displayName}</dd>
            </div>
            <div>
              <dt>{text.candidateChordNames}</dt>
              <dd>
                {summary.candidates.length > 0
                  ? summary.candidates
                      .slice(0, 3)
                      .map((candidate) => {
                        const name =
                          candidate.matchKind === 'omission'
                            ? `${candidate.label} (${text.omissionCandidateNote})`
                            : candidate.label
                        return candidate.explicitTensionLabel
                          ? `${name} · ${candidate.explicitTensionLabel}`
                          : name
                      })
                      .join(', ')
                  : text.noCandidates}
              </dd>
            </div>
            <div>
              <dt>{text.showAdvancedCandidates}</dt>
              <dd>
                <label className="candidate-toggle">
                  <input
                    checked={showAdvancedCandidates}
                    onChange={(event) =>
                      setShowAdvancedCandidates(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{text.showAdvancedCandidates}</span>
                </label>
              </dd>
            </div>
            {showAdvancedCandidates ? (
              <div>
                <dt>{text.inferredChordNames}</dt>
                <dd>
                  {summary.inferredCandidates.length > 0
                    ? summary.inferredCandidates
                        .slice(0, 3)
                        .map(
                          (candidate) =>
                            `${candidate.label} (${text.inferredCandidateNote})`,
                        )
                        .join(', ')
                    : text.noCandidates}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{text.bassNote}</dt>
              <dd>{summary.bassNote ? displayNote(summary.bassNote) : '-'}</dd>
            </div>
            <div>
              <dt>{text.chordTones}</dt>
              <dd>
                {summary.chordTones.length > 0
                  ? summary.chordTones.map(displayNote).join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>{text.uniqueNotes}</dt>
              <dd>
                {summary.uniqueNotes.length > 0
                  ? summary.uniqueNotes.map(displayNote).join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>{text.playedNotes}</dt>
              <dd>
                {summary.playedNotes.length > 0
                  ? summary.playedNotes
                      .map((note) => displayNote(note.note))
                      .join(', ')
                  : '-'}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}

export default ChordComposer

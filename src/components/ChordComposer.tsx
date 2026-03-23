import type { CSSProperties, ChangeEvent } from 'react'
import type {
  ChordForm,
  ChordQuality,
  ChordSummary,
  Fretting,
  PitchClassName,
  StringState,
} from '../music/chords'
import { CHORD_QUALITIES, CHORD_QUALITY_LABELS, PITCH_CLASSES } from '../music/chords'
import type { UiText } from '../uiText'
import ChordDiagram from './ChordDiagram'

interface ManualStringEntry {
  state: StringState
  stringIndex: number
  stringNumber: number
}

interface ChordComposerProps {
  text: UiText
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  availableForms: readonly ChordForm[]
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
  availableForms,
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
  onRootChange,
  onQualityChange,
  onFormChange,
  onChordNameChange,
  onViewportSync,
  onManualStartFretChange,
  onManualFretCountChange,
  onStringStateChange,
}: ChordComposerProps) {
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
            <select aria-label={text.rootNote} onChange={onRootChange} value={selectedRoot}>
              {PITCH_CLASSES.map((pitchClass) => (
                <option key={pitchClass} value={pitchClass}>
                  {pitchClass}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{text.chordQuality}</span>
            <select
              aria-label="Chord quality"
              onChange={onQualityChange}
              value={selectedQuality}
            >
              {CHORD_QUALITIES.map((quality) => (
                <option key={quality} value={quality}>
                  {CHORD_QUALITY_LABELS[quality]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{text.chordForm}</span>
            <select
              aria-label={text.chordForm}
              onChange={onFormChange}
              value={selectedFormId}
            >
              {availableForms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.label}
                </option>
              ))}
            </select>
          </label>
        </div>
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

              <ChordDiagram
                fretting={fretting}
                markerLabels={summary.stringDegreeLabels}
                viewport={summary.viewport}
              />
            </div>

            <div className="manual-builder">
              <div className="manual-builder-header">
                <div>
                  <h3>{text.frettingInput}</h3>
                </div>
                <button
                  className="secondary-button"
                  onClick={onViewportSync}
                  type="button"
                >
                  {text.autoAdjustViewport}
                </button>
              </div>

              <div className="manual-settings">
                <label className="field small">
                  <span>{text.startFret}</span>
                  <input
                    aria-label="Manual start fret"
                    min="1"
                    onChange={onManualStartFretChange}
                    type="number"
                    value={manualStartFret}
                  />
                </label>

                <label className="field small">
                  <span>{text.visibleFretCount}</span>
                  <input
                    aria-label="Manual fret count"
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
                {manualStringEntries.map(({ state, stringIndex, stringNumber }) => (
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
                        {fret}
                      </button>
                    ))}
                  </div>
                ))}
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
                      .map((candidate) => candidate.label)
                      .join(', ')
                  : text.noCandidates}
              </dd>
            </div>
            <div>
              <dt>{text.bassNote}</dt>
              <dd>{summary.bassNote ?? '-'}</dd>
            </div>
            <div>
              <dt>{text.chordTones}</dt>
              <dd>
                {summary.chordTones.length > 0 ? summary.chordTones.join(', ') : '-'}
              </dd>
            </div>
            <div>
              <dt>{text.uniqueNotes}</dt>
              <dd>
                {summary.uniqueNotes.length > 0 ? summary.uniqueNotes.join(', ') : '-'}
              </dd>
            </div>
            <div>
              <dt>{text.playedNotes}</dt>
              <dd>
                {summary.playedNotes.length > 0
                  ? summary.playedNotes.map((note) => note.note).join(', ')
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

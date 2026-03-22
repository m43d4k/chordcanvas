import { useState } from 'react'
import type { ChangeEvent } from 'react'
import ChordDiagram from './components/ChordDiagram'
import {
  CHORD_QUALITIES,
  CHORD_QUALITY_LABELS,
  PITCH_CLASSES,
  type ChordForm,
  type ChordQuality,
  type Fretting,
  type PitchClassName,
  type StringState,
  getChordForms,
  summarizeChord,
  toFretting,
} from './music/chords'

interface ChordBlockState {
  id: string
  fretting: Fretting
  xOffset: number
  spacing: number
}

const DEFAULT_ROOT: PitchClassName = 'E'
const DEFAULT_QUALITY: ChordQuality = 'major'
const DEFAULT_LYRICS = 'Shine a little light over the morning line'
const DEFAULT_SPACING = 36
const LAYOUT_SLOT_WIDTH = 180
const MIN_MANUAL_FRET_COUNT = 3
const MAX_MANUAL_FRET_COUNT = 8

let blockSequence = 1

function createChordBlock(
  fretting: Fretting,
  overrides: Partial<Omit<ChordBlockState, 'id' | 'fretting'>> = {},
): ChordBlockState {
  return {
    id: `chord-${blockSequence++}`,
    fretting,
    xOffset: overrides.xOffset ?? 0,
    spacing: overrides.spacing ?? DEFAULT_SPACING,
  }
}

function copyFretting(fretting: Fretting): Fretting {
  return toFretting([...fretting])
}

function App() {
  const initialForms = getChordForms(DEFAULT_ROOT, DEFAULT_QUALITY)
  const initialForm = initialForms[0]
  const initialBlock = createChordBlock(
    initialForm?.fretting ?? toFretting(['x', 'x', 'x', 'x', 'x', 'x']),
  )
  const initialManualViewport = summarizeChord(initialBlock.fretting).viewport

  const [selectedRoot, setSelectedRoot] = useState<PitchClassName>(DEFAULT_ROOT)
  const [selectedQuality, setSelectedQuality] =
    useState<ChordQuality>(DEFAULT_QUALITY)
  const [selectedFormId, setSelectedFormId] = useState(initialForm?.id ?? '')
  const [lyricsLine, setLyricsLine] = useState(DEFAULT_LYRICS)
  const [blocks, setBlocks] = useState<ChordBlockState[]>([initialBlock])
  const [selectedBlockId, setSelectedBlockId] = useState(initialBlock.id)
  const [manualStartFret, setManualStartFret] = useState(
    initialManualViewport.startFret,
  )
  const [manualFretCount, setManualFretCount] = useState(
    initialManualViewport.fretCount,
  )

  const availableForms = getChordForms(selectedRoot, selectedQuality)
  const selectedForm =
    availableForms.find((form) => form.id === selectedFormId) ??
    availableForms[0] ??
    null

  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? blocks[0]

  if (!selectedBlock) {
    throw new Error('At least one chord block must be present')
  }

  const activeBlock = selectedBlock
  const selectedSummary = summarizeChord(activeBlock.fretting)
  const manualVisibleFrets = createVisibleFrets(
    manualStartFret,
    manualFretCount,
  )
  const manualGridTemplate = `48px 52px 52px repeat(${manualVisibleFrets.length}, minmax(46px, 1fr))`

  const layoutEntries = buildLayoutEntries(blocks, lyricsLine)

  function syncManualViewportFromFretting(fretting: Fretting) {
    const viewport = summarizeChord(fretting).viewport
    setManualStartFret(viewport.startFret)
    setManualFretCount(clampManualFretCount(viewport.fretCount))
  }

  function activateBlock(block: ChordBlockState) {
    setSelectedBlockId(block.id)
    syncManualViewportFromFretting(block.fretting)
  }

  function updateSelectedBlockFretting(fretting: Fretting) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === selectedBlockId ? { ...block, fretting } : block,
      ),
    )
  }

  function updateSelectedBlock(
    updater: (block: ChordBlockState) => ChordBlockState,
  ) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === selectedBlockId ? updater(block) : block,
      ),
    )
  }

  function applyGeneratedForm(form: ChordForm) {
    const fretting = copyFretting(form.fretting)
    setSelectedFormId(form.id)
    updateSelectedBlockFretting(fretting)
    syncManualViewportFromFretting(fretting)
  }

  function handleRootChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRoot = event.target.value as PitchClassName
    const nextForms = getChordForms(nextRoot, selectedQuality)
    const nextForm = nextForms[0]

    setSelectedRoot(nextRoot)
    setSelectedFormId(nextForm?.id ?? '')

    if (nextForm) {
      const fretting = copyFretting(nextForm.fretting)
      updateSelectedBlockFretting(fretting)
      syncManualViewportFromFretting(fretting)
    }
  }

  function handleQualityChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextQuality = event.target.value as ChordQuality
    const nextForms = getChordForms(selectedRoot, nextQuality)
    const nextForm = nextForms[0]

    setSelectedQuality(nextQuality)
    setSelectedFormId(nextForm?.id ?? '')

    if (nextForm) {
      const fretting = copyFretting(nextForm.fretting)
      updateSelectedBlockFretting(fretting)
      syncManualViewportFromFretting(fretting)
    }
  }

  function handleFormChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextForm = availableForms.find(
      (form) => form.id === event.target.value,
    )

    if (!nextForm) {
      return
    }

    applyGeneratedForm(nextForm)
  }

  function setStringState(stringIndex: number, nextState: StringState) {
    const nextFretting = [...activeBlock.fretting]
    nextFretting[stringIndex] = nextState
    updateSelectedBlockFretting(toFretting(nextFretting))
  }

  function handleAddGeneratedBlock() {
    const nextBlock = createChordBlock(copyFretting(activeBlock.fretting))
    setBlocks((currentBlocks) => [...currentBlocks, nextBlock])
    activateBlock(nextBlock)
  }

  function handleDuplicateBlock() {
    const selectedIndex = blocks.findIndex(
      (block) => block.id === selectedBlockId,
    )

    if (selectedIndex < 0) {
      return
    }

    const nextBlock = createChordBlock(copyFretting(activeBlock.fretting), {
      xOffset: activeBlock.xOffset,
      spacing: activeBlock.spacing,
    })

    setBlocks((currentBlocks) => {
      const before = currentBlocks.slice(0, selectedIndex + 1)
      const after = currentBlocks.slice(selectedIndex + 1)
      return [...before, nextBlock, ...after]
    })
    activateBlock(nextBlock)
  }

  function handleDeleteBlock() {
    if (blocks.length === 1) {
      return
    }

    const selectedIndex = blocks.findIndex(
      (block) => block.id === selectedBlockId,
    )
    const nextBlocks = blocks.filter((block) => block.id !== selectedBlockId)
    const fallbackIndex = Math.max(0, selectedIndex - 1)
    const fallbackBlock = nextBlocks[fallbackIndex] ?? nextBlocks[0]

    if (!fallbackBlock) {
      return
    }

    setBlocks(nextBlocks)
    activateBlock(fallbackBlock)
  }

  function handleMoveBlock(direction: -1 | 1) {
    const currentIndex = blocks.findIndex(
      (block) => block.id === selectedBlockId,
    )
    const nextIndex = currentIndex + direction

    if (nextIndex < 0 || nextIndex >= blocks.length) {
      return
    }

    setBlocks((currentBlocks) => {
      const nextBlocks = [...currentBlocks]
      const currentBlock = nextBlocks[currentIndex]
      const swapBlock = nextBlocks[nextIndex]

      if (!currentBlock || !swapBlock) {
        return currentBlocks
      }

      nextBlocks[currentIndex] = swapBlock
      nextBlocks[nextIndex] = currentBlock

      return nextBlocks
    })
  }

  function handleNumberFieldChange(
    key: 'xOffset' | 'spacing',
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const parsed = Number.parseInt(event.target.value, 10)

    updateSelectedBlock((block) => ({
      ...block,
      [key]: Number.isNaN(parsed)
        ? 0
        : key === 'spacing'
          ? Math.max(0, parsed)
          : parsed,
    }))
  }

  function handleManualStartFretChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(event.target.value, 10)
    setManualStartFret(Number.isNaN(parsed) ? 1 : Math.max(1, parsed))
  }

  function handleManualFretCountChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(event.target.value, 10)
    setManualFretCount(
      Number.isNaN(parsed)
        ? MIN_MANUAL_FRET_COUNT
        : clampManualFretCount(parsed),
    )
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Local-first guitar chord workflow</p>
        <h1>ChordCanvas</h1>
        <p className="lead">
          コード生成、押弦編集、コード名判定、歌詞上への配置をブラウザだけで完結させる
          chord editor の初期実装です。
        </p>
      </header>

      <section className="workspace-grid">
        <section
          className="panel generator-panel"
          aria-labelledby="generator-heading"
        >
          <div className="panel-heading">
            <p className="panel-kicker">Phase 2</p>
            <h2 id="generator-heading">コード生成パネル</h2>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>ルート音</span>
              <select
                aria-label="Root note"
                onChange={handleRootChange}
                value={selectedRoot}
              >
                {PITCH_CLASSES.map((pitchClass) => (
                  <option key={pitchClass} value={pitchClass}>
                    {pitchClass}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>コード種別</span>
              <select
                aria-label="Chord quality"
                onChange={handleQualityChange}
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
              <span>候補フォーム</span>
              <select
                aria-label="Chord form"
                onChange={handleFormChange}
                value={selectedForm?.id ?? ''}
              >
                {availableForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="generator-actions">
            <button onClick={handleAddGeneratedBlock} type="button">
              現在のコードを追加
            </button>
            <p>
              現在の選択は編集中のコードに即時反映されます。押弦の直接編集は右の
              コードダイアグラム編集パネルで行えます。
            </p>
          </div>
        </section>

        <section
          className="panel editor-panel"
          aria-labelledby="editor-heading"
        >
          <div className="panel-heading">
            <p className="panel-kicker">Phase 1</p>
            <h2 id="editor-heading">コードダイアグラム編集</h2>
          </div>

          <div className="editor-content">
            <div className="diagram-card">
              <div className="diagram-card-header">
                <div>
                  <p className="meta-label">Selected block</p>
                  <h3>{selectedSummary.currentName}</h3>
                </div>
                <p className="meta-note">ID: {activeBlock.id}</p>
              </div>

              <ChordDiagram
                fretting={activeBlock.fretting}
                viewport={selectedSummary.viewport}
              />
            </div>

            <div className="manual-builder">
              <div className="manual-builder-header">
                <div>
                  <p className="meta-label">Fretting editor</p>
                  <h3>押弦入力</h3>
                </div>
                <button
                  className="secondary-button"
                  onClick={() =>
                    syncManualViewportFromFretting(activeBlock.fretting)
                  }
                  type="button"
                >
                  表示範囲を自動調整
                </button>
              </div>

              <div className="manual-settings">
                <label className="field small">
                  <span>開始フレット</span>
                  <input
                    aria-label="Manual start fret"
                    min="1"
                    onChange={handleManualStartFretChange}
                    type="number"
                    value={manualStartFret}
                  />
                </label>

                <label className="field small">
                  <span>表示フレット数</span>
                  <input
                    aria-label="Manual fret count"
                    max={MAX_MANUAL_FRET_COUNT}
                    min={MIN_MANUAL_FRET_COUNT}
                    onChange={handleManualFretCountChange}
                    type="number"
                    value={manualFretCount}
                  />
                </label>
              </div>

              <div
                className="manual-grid"
                role="group"
                aria-label="Fretting editor"
              >
                <div
                  className="manual-grid-header"
                  style={{ gridTemplateColumns: manualGridTemplate }}
                >
                  <span className="manual-grid-corner">弦</span>
                  <span className="manual-grid-status">X</span>
                  <span className="manual-grid-status">O</span>
                  {manualVisibleFrets.map((fret) => (
                    <span
                      className="manual-grid-fret-label"
                      key={`manual-fret-${fret}`}
                    >
                      {fret}
                    </span>
                  ))}
                </div>

                {activeBlock.fretting.map((state, stringIndex) => (
                  <div
                    className="manual-grid-row"
                    key={`manual-row-${stringIndex}`}
                    style={{ gridTemplateColumns: manualGridTemplate }}
                  >
                    <span className="manual-grid-string">
                      {6 - stringIndex}弦
                    </span>
                    <button
                      aria-label={`${6 - stringIndex}弦 ミュート`}
                      aria-pressed={state === 'x'}
                      className={state === 'x' ? 'active' : ''}
                      onClick={() => setStringState(stringIndex, 'x')}
                      type="button"
                    >
                      X
                    </button>
                    <button
                      aria-label={`${6 - stringIndex}弦 開放`}
                      aria-pressed={state === 0}
                      className={state === 0 ? 'active' : ''}
                      onClick={() => setStringState(stringIndex, 0)}
                      type="button"
                    >
                      O
                    </button>
                    {manualVisibleFrets.map((fret) => (
                      <button
                        aria-label={`${6 - stringIndex}弦 ${fret}フレット`}
                        aria-pressed={state === fret}
                        className={state === fret ? 'active' : ''}
                        key={`manual-string-${stringIndex}-fret-${fret}`}
                        onClick={() => setStringState(stringIndex, fret)}
                        type="button"
                      >
                        {fret}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              <p className="manual-builder-note">
                コード生成で選んだフォームも既存コードも、ここで同じ UI
                から直接編集できます。
              </p>
            </div>
          </div>
        </section>

        <section className="panel info-panel" aria-labelledby="info-heading">
          <div className="panel-heading">
            <p className="panel-kicker">Phase 2</p>
            <h2 id="info-heading">コード情報</h2>
          </div>

          <dl className="info-list">
            <div>
              <dt>現在のコード名</dt>
              <dd>{selectedSummary.currentName}</dd>
            </div>
            <div>
              <dt>候補コード名</dt>
              <dd>
                {selectedSummary.candidates.length > 0
                  ? selectedSummary.candidates
                      .slice(0, 3)
                      .map((candidate) => candidate.label)
                      .join(', ')
                  : '該当なし'}
              </dd>
            </div>
            <div>
              <dt>ベース音</dt>
              <dd>{selectedSummary.bassNote ?? '-'}</dd>
            </div>
            <div>
              <dt>構成音</dt>
              <dd>
                {selectedSummary.chordTones.length > 0
                  ? selectedSummary.chordTones.join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>ユニーク音</dt>
              <dd>
                {selectedSummary.uniqueNotes.length > 0
                  ? selectedSummary.uniqueNotes.join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>発音音</dt>
              <dd>
                {selectedSummary.playedNotes.length > 0
                  ? selectedSummary.playedNotes
                      .map((note) => note.note)
                      .join(', ')
                  : '-'}
              </dd>
            </div>
          </dl>
        </section>
      </section>

      <section className="panel layout-panel" aria-labelledby="layout-heading">
        <div className="panel-heading">
          <p className="panel-kicker">Phase 3</p>
          <h2 id="layout-heading">レイアウト編集</h2>
        </div>

        <div className="layout-toolbar">
          <button onClick={handleDuplicateBlock} type="button">
            選択コードを複製
          </button>
          <button
            disabled={blocks.length === 1}
            onClick={handleDeleteBlock}
            type="button"
          >
            選択コードを削除
          </button>
          <button
            disabled={blocks[0]?.id === selectedBlockId}
            onClick={() => handleMoveBlock(-1)}
            type="button"
          >
            左へ並び替え
          </button>
          <button
            disabled={blocks[blocks.length - 1]?.id === selectedBlockId}
            onClick={() => handleMoveBlock(1)}
            type="button"
          >
            右へ並び替え
          </button>
        </div>

        <div className="layout-controls">
          <label className="field">
            <span>歌詞 1 行</span>
            <input
              aria-label="Lyrics line"
              onChange={(event) => setLyricsLine(event.target.value)}
              type="text"
              value={lyricsLine}
            />
          </label>

          <label className="field small">
            <span>横オフセット(px)</span>
            <input
              aria-label="Block horizontal offset"
              onChange={(event) => handleNumberFieldChange('xOffset', event)}
              type="number"
              value={activeBlock.xOffset}
            />
          </label>

          <label className="field small">
            <span>後続との間隔(px)</span>
            <input
              aria-label="Block spacing"
              min="0"
              onChange={(event) => handleNumberFieldChange('spacing', event)}
              type="number"
              value={activeBlock.spacing}
            />
          </label>
        </div>

        <div className="layout-stage-wrapper">
          <div
            className="layout-stage"
            style={{ width: `${layoutEntries.stageWidth}px` }}
          >
            <div className="layout-chord-layer">
              {layoutEntries.entries.map((entry) => (
                <button
                  aria-label={`Select ${entry.summary.currentName} block`}
                  className={`layout-chord-block${
                    entry.block.id === selectedBlockId ? ' selected' : ''
                  }`}
                  key={entry.block.id}
                  onClick={() => activateBlock(entry.block)}
                  style={{ left: `${entry.left}px` }}
                  type="button"
                >
                  <span className="layout-block-name">
                    {entry.summary.currentName}
                  </span>
                  <ChordDiagram
                    compact
                    fretting={entry.block.fretting}
                    viewport={entry.summary.viewport}
                  />
                </button>
              ))}
            </div>

            <div className="lyrics-line">{lyricsLine}</div>
          </div>
        </div>
      </section>
    </main>
  )
}

function clampManualFretCount(value: number): number {
  return Math.min(MAX_MANUAL_FRET_COUNT, Math.max(MIN_MANUAL_FRET_COUNT, value))
}

function createVisibleFrets(startFret: number, fretCount: number): number[] {
  return Array.from({ length: fretCount }, (_, index) => startFret + index)
}

function buildLayoutEntries(
  blocks: readonly ChordBlockState[],
  lyricsLine: string,
) {
  let cursor = 20

  const entries = blocks.map((block) => {
    const summary = summarizeChord(block.fretting)
    const left = Math.max(0, cursor + block.xOffset)
    cursor += LAYOUT_SLOT_WIDTH + block.spacing

    return {
      block,
      summary,
      left,
    }
  })

  const lyricWidth = Math.max(640, lyricsLine.length * 11 + 80)

  return {
    entries,
    stageWidth: Math.max(cursor + 40, lyricWidth),
  }
}

export default App

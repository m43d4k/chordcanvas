import { useRef, useState } from 'react'
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
import {
  cloneProjectSnapshot,
  parseProjectFile,
  serializeProjectFile,
  type ChordBlockState,
  type LayoutRowState,
  type ProjectSnapshot,
} from './project/projectFile'

const DEFAULT_ROOT: PitchClassName = 'E'
const DEFAULT_QUALITY: ChordQuality = 'major'
const DEFAULT_LYRICS = 'Shine a little light over the morning line'
const DEFAULT_SPACING = 36
const LAYOUT_SLOT_WIDTH = 180
const MIN_MANUAL_FRET_COUNT = 3
const MAX_MANUAL_FRET_COUNT = 8
const PROJECT_EXPORT_FILE_NAME = 'chordcanvas-project.json'

interface ProjectFeedback {
  kind: 'success' | 'error'
  text: string
}

let blockSequence = 1
let rowSequence = 1

function createLayoutRow(lyrics = ''): LayoutRowState {
  return {
    id: `row-${rowSequence++}`,
    lyrics,
  }
}

function createChordBlock(
  fretting: Fretting,
  rowId: string,
  overrides: Partial<Omit<ChordBlockState, 'id' | 'fretting' | 'rowId'>> = {},
): ChordBlockState {
  return {
    id: `chord-${blockSequence++}`,
    fretting,
    xOffset: overrides.xOffset ?? 0,
    spacing: overrides.spacing ?? DEFAULT_SPACING,
    rowId,
  }
}

function copyFretting(fretting: Fretting): Fretting {
  return toFretting([...fretting])
}

function createInitialAppState() {
  const initialForms = getChordForms(DEFAULT_ROOT, DEFAULT_QUALITY)
  const initialForm = initialForms[0]
  const initialRow = createLayoutRow(DEFAULT_LYRICS)
  const initialBlock = createChordBlock(
    initialForm?.fretting ?? toFretting(['x', 'x', 'x', 'x', 'x', 'x']),
    initialRow.id,
  )
  const initialManualViewport = summarizeChord(initialBlock.fretting).viewport

  return {
    initialFormId: initialForm?.id ?? '',
    initialRow,
    initialBlock,
    initialManualViewport,
  }
}

function getLayoutRowLabel(index: number): string {
  return `${index + 1}行目`
}

function getRowBlockIndices(
  blocks: readonly ChordBlockState[],
  rowId: string,
): number[] {
  const indices: number[] = []

  blocks.forEach((block, index) => {
    if (block.rowId === rowId) {
      indices.push(index)
    }
  })

  return indices
}

function getInsertionIndexForRow(
  blocks: readonly ChordBlockState[],
  layoutRows: readonly LayoutRowState[],
  rowId: string,
): number {
  const rowOrder = new Map(layoutRows.map((row, index) => [row.id, index]))
  const targetRowIndex = rowOrder.get(rowId)

  if (targetRowIndex === undefined) {
    return blocks.length
  }

  let insertionIndex = 0
  let hasPreviousBlock = false

  blocks.forEach((block, index) => {
    const blockRowIndex = rowOrder.get(block.rowId)

    if (blockRowIndex !== undefined && blockRowIndex <= targetRowIndex) {
      insertionIndex = index + 1
      hasPreviousBlock = true
    }
  })

  if (hasPreviousBlock) {
    return insertionIndex
  }

  const nextRowBlockIndex = blocks.findIndex((block) => {
    const blockRowIndex = rowOrder.get(block.rowId)
    return blockRowIndex !== undefined && blockRowIndex > targetRowIndex
  })

  return nextRowBlockIndex < 0 ? blocks.length : nextRowBlockIndex
}

function moveBlockToRow(
  blocks: readonly ChordBlockState[],
  layoutRows: readonly LayoutRowState[],
  blockId: string,
  rowId: string,
): ChordBlockState[] {
  const currentIndex = blocks.findIndex((block) => block.id === blockId)

  if (currentIndex < 0) {
    return [...blocks]
  }

  const currentBlock = blocks[currentIndex]

  if (!currentBlock || currentBlock.rowId === rowId) {
    return [...blocks]
  }

  const remainingBlocks = blocks.filter((block) => block.id !== blockId)
  const insertionIndex = getInsertionIndexForRow(
    remainingBlocks,
    layoutRows,
    rowId,
  )
  const movedBlock = {
    ...currentBlock,
    rowId,
  }

  return [
    ...remainingBlocks.slice(0, insertionIndex),
    movedBlock,
    ...remainingBlocks.slice(insertionIndex),
  ]
}

function getNextSequenceValue(
  ids: readonly string[],
  prefix: string,
  fallback = 1,
): number {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sequencePattern = new RegExp(`^${escapedPrefix}(\\d+)$`)
  let nextValue = fallback

  ids.forEach((id) => {
    const match = id.match(sequencePattern)

    if (!match) {
      return
    }

    const sequence = Number.parseInt(match[1] ?? '', 10)

    if (!Number.isNaN(sequence)) {
      nextValue = Math.max(nextValue, sequence + 1)
    }
  })

  return nextValue
}

function syncProjectSequences(snapshot: ProjectSnapshot) {
  rowSequence = getNextSequenceValue(
    snapshot.layoutRows.map((row) => row.id),
    'row-',
  )
  blockSequence = getNextSequenceValue(
    snapshot.blocks.map((block) => block.id),
    'chord-',
  )
}

function App() {
  const [initialState] = useState(createInitialAppState)
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedRoot, setSelectedRoot] = useState<PitchClassName>(DEFAULT_ROOT)
  const [selectedQuality, setSelectedQuality] =
    useState<ChordQuality>(DEFAULT_QUALITY)
  const [selectedFormId, setSelectedFormId] = useState(
    initialState.initialFormId,
  )
  const [layoutRows, setLayoutRows] = useState<LayoutRowState[]>(() => [
    initialState.initialRow,
  ])
  const [blocks, setBlocks] = useState<ChordBlockState[]>(() => [
    initialState.initialBlock,
  ])
  const [selectedBlockId, setSelectedBlockId] = useState(
    initialState.initialBlock.id,
  )
  const [selectedLayoutRowId, setSelectedLayoutRowId] = useState(
    initialState.initialRow.id,
  )
  const [manualStartFret, setManualStartFret] = useState(
    initialState.initialManualViewport.startFret,
  )
  const [manualFretCount, setManualFretCount] = useState(
    initialState.initialManualViewport.fretCount,
  )
  const [projectFeedback, setProjectFeedback] =
    useState<ProjectFeedback | null>(null)

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
  const activeLayoutRow = layoutRows.find((row) => row.id === activeBlock.rowId)

  if (!activeLayoutRow) {
    throw new Error('At least one layout row must be present')
  }

  const activeLayoutRowId = activeLayoutRow.id
  const selectedLayoutRow =
    layoutRows.find((row) => row.id === selectedLayoutRowId) ?? activeLayoutRow
  const selectedLayoutRowIndex = Math.max(
    0,
    layoutRows.findIndex((row) => row.id === selectedLayoutRow.id),
  )
  const selectedLayoutRowLabel = getLayoutRowLabel(selectedLayoutRowIndex)
  const activeRowBlockIds = blocks
    .filter((block) => block.rowId === activeLayoutRowId)
    .map((block) => block.id)
  const activeRowSelectionIndex = activeRowBlockIds.findIndex(
    (blockId) => blockId === selectedBlockId,
  )
  const selectedSummary = summarizeChord(activeBlock.fretting)
  const manualVisibleFrets = createVisibleFrets(
    manualStartFret,
    manualFretCount,
  )
  const manualGridTemplate = `36px 36px 36px repeat(${manualVisibleFrets.length}, minmax(0, 1fr))`

  const layoutEntries = buildLayoutEntries(layoutRows, blocks)

  function createProjectSnapshot(): ProjectSnapshot {
    return cloneProjectSnapshot({
      selectedRoot,
      selectedQuality,
      selectedFormId,
      layoutRows,
      blocks,
      selectedBlockId,
      selectedLayoutRowId,
      manualStartFret,
      manualFretCount,
    })
  }

  function applyProjectSnapshot(snapshot: ProjectSnapshot) {
    const nextSnapshot = cloneProjectSnapshot(snapshot)

    syncProjectSequences(nextSnapshot)
    setSelectedRoot(nextSnapshot.selectedRoot)
    setSelectedQuality(nextSnapshot.selectedQuality)
    setSelectedFormId(nextSnapshot.selectedFormId)
    setLayoutRows(nextSnapshot.layoutRows)
    setBlocks(nextSnapshot.blocks)
    setSelectedBlockId(nextSnapshot.selectedBlockId)
    setSelectedLayoutRowId(nextSnapshot.selectedLayoutRowId)
    setManualStartFret(Math.max(1, nextSnapshot.manualStartFret))
    setManualFretCount(clampManualFretCount(nextSnapshot.manualFretCount))
  }

  function syncManualViewportFromFretting(fretting: Fretting) {
    const viewport = summarizeChord(fretting).viewport
    setManualStartFret(viewport.startFret)
    setManualFretCount(clampManualFretCount(viewport.fretCount))
  }

  function activateBlock(block: ChordBlockState) {
    setSelectedBlockId(block.id)
    setSelectedLayoutRowId(block.rowId)
    syncManualViewportFromFretting(block.fretting)
  }

  function selectLayoutRow(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    setSelectedLayoutRowId(rowId)
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
    const nextBlock = createChordBlock(
      copyFretting(activeBlock.fretting),
      selectedLayoutRow.id,
    )

    setBlocks((currentBlocks) => {
      const insertionIndex = getInsertionIndexForRow(
        currentBlocks,
        layoutRows,
        selectedLayoutRow.id,
      )

      return [
        ...currentBlocks.slice(0, insertionIndex),
        nextBlock,
        ...currentBlocks.slice(insertionIndex),
      ]
    })
    activateBlock(nextBlock)
  }

  function handleDuplicateBlock() {
    const selectedIndex = blocks.findIndex(
      (block) => block.id === selectedBlockId,
    )

    if (selectedIndex < 0) {
      return
    }

    const nextBlock = createChordBlock(
      copyFretting(activeBlock.fretting),
      activeLayoutRowId,
      {
        xOffset: activeBlock.xOffset,
        spacing: activeBlock.spacing,
      },
    )

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
    setBlocks((currentBlocks) => {
      const currentIndex = currentBlocks.findIndex(
        (block) => block.id === selectedBlockId,
      )

      if (currentIndex < 0) {
        return currentBlocks
      }

      const rowBlockIndices = getRowBlockIndices(
        currentBlocks,
        activeLayoutRowId,
      )
      const currentRowIndex = rowBlockIndices.findIndex(
        (index) => index === currentIndex,
      )
      const nextRowIndex = currentRowIndex + direction

      if (nextRowIndex < 0 || nextRowIndex >= rowBlockIndices.length) {
        return currentBlocks
      }

      const nextIndex = rowBlockIndices[nextRowIndex]

      if (nextIndex === undefined) {
        return currentBlocks
      }

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

  function handleAddLayoutRow() {
    const nextRow = createLayoutRow()
    setLayoutRows((currentRows) => [...currentRows, nextRow])
    setSelectedLayoutRowId(nextRow.id)
  }

  function handleLyricsLineChange(
    rowId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextLyrics = event.target.value

    setLayoutRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId ? { ...row, lyrics: nextLyrics } : row,
      ),
    )
  }

  function handleBlockRowChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRowId = event.target.value

    if (!layoutRows.some((row) => row.id === nextRowId)) {
      return
    }

    setBlocks((currentBlocks) =>
      moveBlockToRow(currentBlocks, layoutRows, selectedBlockId, nextRowId),
    )
    setSelectedLayoutRowId(nextRowId)
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

  function openProjectFilePicker() {
    projectFileInputRef.current?.click()
  }

  function handleProjectExport() {
    const projectJson = serializeProjectFile(createProjectSnapshot())
    const projectBlob = new Blob([projectJson], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(projectBlob)
    const downloadLink = document.createElement('a')

    downloadLink.href = objectUrl
    downloadLink.download = PROJECT_EXPORT_FILE_NAME
    downloadLink.click()
    URL.revokeObjectURL(objectUrl)
    setProjectFeedback({
      kind: 'success',
      text: `${PROJECT_EXPORT_FILE_NAME} を書き出しました。`,
    })
  }

  async function handleProjectImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]

    if (!file) {
      return
    }

    try {
      const nextSnapshot = parseProjectFile(await file.text())
      applyProjectSnapshot(nextSnapshot)
      setProjectFeedback({
        kind: 'success',
        text: `${file.name} を読み込みました。現在の project を置き換えています。`,
      })
    } catch (error) {
      setProjectFeedback({
        kind: 'error',
        text: `インポートに失敗しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`,
      })
    } finally {
      input.value = ''
    }
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

        <div className="hero-actions">
          <div className="project-actions">
            <button
              className="secondary-button"
              onClick={handleProjectExport}
              type="button"
            >
              プロジェクトを書き出し
            </button>
            <button
              className="secondary-button"
              onClick={openProjectFilePicker}
              type="button"
            >
              プロジェクトを読み込む
            </button>
            <input
              accept="application/json,.json"
              aria-label="Project JSON file"
              className="visually-hidden"
              onChange={handleProjectImport}
              ref={projectFileInputRef}
              type="file"
            />
          </div>

          <p
            className={`project-feedback${
              projectFeedback ? ` ${projectFeedback.kind}` : ''
            }`}
            role={projectFeedback?.kind === 'error' ? 'alert' : 'status'}
          >
            {projectFeedback?.text ??
              '現在の project は JSON で書き出し・読み込みできます。'}
          </p>
        </div>
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
          <button onClick={handleAddLayoutRow} type="button">
            行を追加
          </button>
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
            disabled={activeRowSelectionIndex <= 0}
            onClick={() => handleMoveBlock(-1)}
            type="button"
          >
            左へ並び替え
          </button>
          <button
            disabled={
              activeRowSelectionIndex < 0 ||
              activeRowSelectionIndex === activeRowBlockIds.length - 1
            }
            onClick={() => handleMoveBlock(1)}
            type="button"
          >
            右へ並び替え
          </button>
        </div>

        <div className="layout-row-fields">
          {layoutRows.map((row, index) => (
            <label
              className={`field${row.id === selectedLayoutRow.id ? ' active' : ''}`}
              key={row.id}
            >
              <span>歌詞 {index + 1} 行</span>
              <input
                aria-label={`Lyrics line ${index + 1}`}
                onChange={(event) => handleLyricsLineChange(row.id, event)}
                onFocus={() => selectLayoutRow(row.id)}
                type="text"
                value={row.lyrics}
              />
            </label>
          ))}
        </div>

        <div className="layout-controls">
          <p className="layout-selection-note">
            追加先の行: {selectedLayoutRowLabel}
          </p>

          <label className="field small">
            <span>選択コードの配置行</span>
            <select
              aria-label="Block row"
              onChange={handleBlockRowChange}
              value={activeBlock.rowId}
            >
              {layoutRows.map((row, index) => (
                <option key={row.id} value={row.id}>
                  {getLayoutRowLabel(index)}
                </option>
              ))}
            </select>
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
            {layoutEntries.rows.map((rowEntry, index) => (
              <section
                aria-labelledby={`layout-row-heading-${rowEntry.row.id}`}
                className={`layout-row${
                  rowEntry.row.id === selectedLayoutRow.id ? ' selected' : ''
                }`}
                key={rowEntry.row.id}
              >
                <div className="layout-row-header">
                  <h3 id={`layout-row-heading-${rowEntry.row.id}`}>
                    {getLayoutRowLabel(index)}
                  </h3>
                  <button
                    aria-label={`${getLayoutRowLabel(index)} を追加先にする`}
                    aria-pressed={rowEntry.row.id === selectedLayoutRow.id}
                    className="secondary-button layout-row-selector"
                    onClick={() => selectLayoutRow(rowEntry.row.id)}
                    type="button"
                  >
                    {rowEntry.row.id === selectedLayoutRow.id
                      ? '追加先'
                      : 'この行に追加'}
                  </button>
                </div>

                <div className="layout-chord-layer">
                  {rowEntry.entries.map((entry) => (
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

                <div className="lyrics-line">
                  {rowEntry.row.lyrics || '\u00a0'}
                </div>
              </section>
            ))}
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
  layoutRows: readonly LayoutRowState[],
  blocks: readonly ChordBlockState[],
) {
  const rows = layoutRows.map((row) => {
    let cursor = 20
    const entries = blocks
      .filter((block) => block.rowId === row.id)
      .map((block) => {
        const summary = summarizeChord(block.fretting)
        const left = Math.max(0, cursor + block.xOffset)
        cursor += LAYOUT_SLOT_WIDTH + block.spacing

        return {
          block,
          summary,
          left,
        }
      })

    const lyricWidth = Math.max(640, row.lyrics.length * 11 + 80)

    return {
      row,
      entries,
      stageWidth: Math.max(cursor + 40, lyricWidth),
    }
  })

  return {
    rows,
    stageWidth: rows.reduce(
      (maxWidth, rowEntry) => Math.max(maxWidth, rowEntry.stageWidth),
      640,
    ),
  }
}

export default App

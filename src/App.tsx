import { useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import ChordDiagram from './components/ChordDiagram'
import { exportLayoutStagePdf, LAYOUT_PDF_FILE_NAME } from './export/layoutPdf'
import {
  CHORD_QUALITIES,
  CHORD_QUALITY_LABELS,
  MINIMUM_DIAGRAM_FRET_COUNT,
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
  type StockChordState,
} from './project/projectFile'

const DEFAULT_ROOT: PitchClassName = 'E'
const DEFAULT_QUALITY: ChordQuality = 'major'
const DEFAULT_LYRICS = 'Shine a little light over the morning line'
const DEFAULT_SPACING = 6
const LAYOUT_BLOCK_WIDTH = 152
const LAYOUT_SLOT_WIDTH = LAYOUT_BLOCK_WIDTH
const LAYOUT_STAGE_MIN_WIDTH = 640
const LAYOUT_STAGE_PADDING_INLINE = 16
const LAYOUT_ROW_PADDING_INLINE = 15.2
const MIN_MANUAL_FRET_COUNT = MINIMUM_DIAGRAM_FRET_COUNT
const MAX_MANUAL_FRET_COUNT = 12
const PROJECT_EXPORT_FILE_NAME = 'chordcanvas-project.json'

interface AppFeedback {
  kind: 'success' | 'error'
  text: string
}

let blockSequence = 1
let rowSequence = 1
let stockSequence = 1

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

function createStockChord(fretting: Fretting): StockChordState {
  return {
    id: `stock-${stockSequence++}`,
    fretting,
  }
}

function copyFretting(fretting: Fretting): Fretting {
  return toFretting([...fretting])
}

function isSameFretting(left: Fretting, right: Fretting): boolean {
  return left.every((state, index) => state === right[index])
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
  stockSequence = getNextSequenceValue(
    snapshot.stockChords.map((stockChord) => stockChord.id),
    'stock-',
  )
  blockSequence = getNextSequenceValue(
    snapshot.blocks.map((block) => block.id),
    'chord-',
  )
}

function App() {
  const [initialState] = useState(createInitialAppState)
  const layoutStageRef = useRef<HTMLDivElement | null>(null)
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedRoot, setSelectedRoot] = useState<PitchClassName>(DEFAULT_ROOT)
  const [selectedQuality, setSelectedQuality] =
    useState<ChordQuality>(DEFAULT_QUALITY)
  const [selectedFormId, setSelectedFormId] = useState(
    initialState.initialFormId,
  )
  const [currentFretting, setCurrentFretting] = useState<Fretting>(() =>
    copyFretting(initialState.initialBlock.fretting),
  )
  const [layoutRows, setLayoutRows] = useState<LayoutRowState[]>(() => [
    initialState.initialRow,
  ])
  const [stockChords, setStockChords] = useState<StockChordState[]>([])
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
  const [appFeedback, setAppFeedback] = useState<AppFeedback | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)

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

  const isEditingSelectedBlock = editingBlockId === selectedBlockId
  const activeLayoutRow = layoutRows.find((row) => row.id === selectedBlock.rowId)

  if (!activeLayoutRow) {
    throw new Error('At least one layout row must be present')
  }

  const activeLayoutRowId = activeLayoutRow.id
  const selectedLayoutRow =
    layoutRows.find((row) => row.id === selectedLayoutRowId) ?? activeLayoutRow
  const activeRowBlockIds = blocks
    .filter((block) => block.rowId === activeLayoutRowId)
    .map((block) => block.id)
  const activeRowSelectionIndex = activeRowBlockIds.findIndex(
    (blockId) => blockId === selectedBlockId,
  )
  const selectedBlockSummary = summarizeChord(selectedBlock.fretting)
  const currentSummary = summarizeChord(currentFretting)
  const stockEntries = stockChords.map((stockChord) => ({
    stockChord,
    summary: summarizeChord(stockChord.fretting),
  }))
  const isCurrentChordStocked = stockChords.some((stockChord) =>
    isSameFretting(stockChord.fretting, currentFretting),
  )
  const manualVisibleFrets = createVisibleFrets(
    manualStartFret,
    manualFretCount,
  )
  const manualGridTemplate = `36px 36px 36px repeat(${manualVisibleFrets.length}, minmax(0, 1fr))`
  const manualStringEntries = currentFretting
    .map((state, stringIndex) => ({
      state,
      stringIndex,
      stringNumber: 6 - stringIndex,
    }))
    .reverse()

  const layoutEntries = buildLayoutEntries(layoutRows, blocks)
  const layoutStageStyle = {
    width: `${layoutEntries.stageWidth}px`,
    '--layout-block-width': `${LAYOUT_BLOCK_WIDTH}px`,
    '--layout-row-padding-inline': `${LAYOUT_ROW_PADDING_INLINE}px`,
    '--layout-stage-padding-inline': `${LAYOUT_STAGE_PADDING_INLINE}px`,
  } as CSSProperties

  function createProjectSnapshot(): ProjectSnapshot {
    return cloneProjectSnapshot({
      selectedRoot,
      selectedQuality,
      selectedFormId,
      currentFretting,
      layoutRows,
      stockChords,
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
    setEditingBlockId(null)
    setSelectedRoot(nextSnapshot.selectedRoot)
    setSelectedQuality(nextSnapshot.selectedQuality)
    setSelectedFormId(nextSnapshot.selectedFormId)
    setCurrentFretting(nextSnapshot.currentFretting)
    setLayoutRows(nextSnapshot.layoutRows)
    setStockChords(nextSnapshot.stockChords)
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
    setEditingBlockId((currentEditingId) =>
      currentEditingId === block.id ? currentEditingId : null,
    )
  }

  function toggleSelectedBlockEditing() {
    if (isEditingSelectedBlock) {
      setEditingBlockId(null)
      return
    }

    const nextSelectedBlock = blocks.find((block) => block.id === selectedBlockId)

    if (!nextSelectedBlock) {
      return
    }

    const nextFretting = copyFretting(nextSelectedBlock.fretting)
    setCurrentFretting(nextFretting)
    syncManualViewportFromFretting(nextFretting)
    setEditingBlockId(selectedBlockId)
  }

  function selectLayoutRow(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    setSelectedLayoutRowId(rowId)
  }

  function updateBlockFretting(blockId: string, fretting: Fretting) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === blockId ? { ...block, fretting } : block,
      ),
    )
  }

  function applyCurrentFretting(fretting: Fretting) {
    const nextFretting = copyFretting(fretting)
    setCurrentFretting(nextFretting)

    if (editingBlockId) {
      updateBlockFretting(editingBlockId, nextFretting)
    }
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
    applyCurrentFretting(fretting)
    syncManualViewportFromFretting(fretting)
  }

  function addBlockToSelectedLayoutRow(fretting: Fretting) {
    const nextBlock = createChordBlock(
      copyFretting(fretting),
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

  function handleRootChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRoot = event.target.value as PitchClassName
    const nextForms = getChordForms(nextRoot, selectedQuality)
    const nextForm = nextForms[0]

    setSelectedRoot(nextRoot)
    setSelectedFormId(nextForm?.id ?? '')

    if (nextForm) {
      const fretting = copyFretting(nextForm.fretting)
      applyCurrentFretting(fretting)
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
      applyCurrentFretting(fretting)
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
    const nextFretting = [...currentFretting]
    nextFretting[stringIndex] = nextState
    applyCurrentFretting(toFretting(nextFretting))
  }

  function handleAddGeneratedBlock() {
    addBlockToSelectedLayoutRow(currentFretting)
  }

  function handleAddCurrentChordToStock() {
    if (isCurrentChordStocked) {
      setAppFeedback({
        kind: 'success',
        text: `${currentSummary.currentName} はすでにストック済みです。`,
      })
      return
    }

    const nextStockChord = createStockChord(copyFretting(currentFretting))

    setStockChords((currentStockChords) => [
      ...currentStockChords,
      nextStockChord,
    ])
    setAppFeedback({
      kind: 'success',
      text: `${currentSummary.currentName} をストックに追加しました。`,
    })
  }

  function handleAddStockChordToLayout(stockChordId: string) {
    const stockChord = stockChords.find((entry) => entry.id === stockChordId)

    if (!stockChord) {
      return
    }

    addBlockToSelectedLayoutRow(stockChord.fretting)
  }

  function handleRemoveStockChord(stockChordId: string) {
    const stockChord = stockChords.find((entry) => entry.id === stockChordId)

    if (!stockChord) {
      return
    }

    const stockSummary = summarizeChord(stockChord.fretting)

    setStockChords((currentStockChords) =>
      currentStockChords.filter((entry) => entry.id !== stockChordId),
    )
    setAppFeedback({
      kind: 'success',
      text: `${stockSummary.currentName} をストックから削除しました。`,
    })
  }

  function handleDuplicateBlock() {
    const selectedIndex = blocks.findIndex(
      (block) => block.id === selectedBlockId,
    )
    const nextSelectedBlock = blocks[selectedIndex]

    if (selectedIndex < 0 || !nextSelectedBlock) {
      return
    }

    const nextBlock = createChordBlock(
      copyFretting(nextSelectedBlock.fretting),
      activeLayoutRowId,
      {
        xOffset: nextSelectedBlock.xOffset,
        spacing: nextSelectedBlock.spacing,
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

    if (editingBlockId === selectedBlockId) {
      setEditingBlockId(null)
    }

    setBlocks(nextBlocks)
    setSelectedBlockId(fallbackBlock.id)
    setSelectedLayoutRowId(fallbackBlock.rowId)
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

  function handleDeleteSelectedLayoutRow() {
    if (layoutRows.length === 1) {
      return
    }

    const selectedRowIndex = layoutRows.findIndex(
      (row) => row.id === selectedLayoutRow.id,
    )
    const rowToRemove = layoutRows[selectedRowIndex]
    const fallbackRow =
      layoutRows[selectedRowIndex - 1] ?? layoutRows[selectedRowIndex + 1]

    if (!rowToRemove || !fallbackRow) {
      return
    }

    setLayoutRows((currentRows) =>
      currentRows.filter((row) => row.id !== rowToRemove.id),
    )
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.rowId === rowToRemove.id
          ? {
              ...block,
              rowId: fallbackRow.id,
            }
          : block,
      ),
    )
    setSelectedLayoutRowId(fallbackRow.id)
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
    setAppFeedback({
      kind: 'success',
      text: `${PROJECT_EXPORT_FILE_NAME} を書き出しました。`,
    })
  }

  async function handlePdfExport() {
    const layoutStageElement = layoutStageRef.current

    if (!layoutStageElement) {
      setAppFeedback({
        kind: 'error',
        text: 'PDF 出力に失敗しました: レイアウト領域を取得できませんでした。',
      })
      return
    }

    setIsExportingPdf(true)

    try {
      await exportLayoutStagePdf(layoutStageElement)
      setAppFeedback({
        kind: 'success',
        text: `${LAYOUT_PDF_FILE_NAME} を書き出しました。`,
      })
    } catch (error) {
      setAppFeedback({
        kind: 'error',
        text: `PDF 出力に失敗しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`,
      })
    } finally {
      setIsExportingPdf(false)
    }
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
      setAppFeedback({
        kind: 'success',
        text: `${file.name} を読み込みました。現在の project を置き換えています。`,
      })
    } catch (error) {
      setAppFeedback({
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
        <h1>ChordCanvas</h1>
        <p className="lead">
          コード生成、押弦編集、コード名判定、歌詞上への配置をブラウザだけで完結させる
          chord editor の初期実装です。
        </p>

        <div className="hero-actions">
          <div className="project-actions">
            <button
              className="secondary-button"
              disabled={isExportingPdf}
              onClick={handlePdfExport}
              type="button"
            >
              {isExportingPdf ? 'PDF を書き出し中...' : 'レイアウトを PDF 出力'}
            </button>
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

          {appFeedback ? (
            <p
              className={`project-feedback ${appFeedback.kind}`}
              role={appFeedback.kind === 'error' ? 'alert' : 'status'}
            >
              {appFeedback.text}
            </p>
          ) : null}
        </div>
      </header>

      <section className="workspace-grid">
        <section
          className="panel generator-panel"
          aria-labelledby="generator-heading"
        >
          <div className="panel-heading">
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
            <button
              disabled={isCurrentChordStocked}
              onClick={handleAddCurrentChordToStock}
              type="button"
            >
              {isCurrentChordStocked
                ? 'このコードはストック済み'
                : 'ストックに追加'}
            </button>
          </div>
        </section>

        <section
          className="panel editor-panel"
          aria-labelledby="editor-heading"
        >
          <div className="panel-heading">
            <h2 id="editor-heading">コードダイアグラム編集</h2>
          </div>

          <div className="editor-content">
            <div className="diagram-card">
              <div className="diagram-card-header">
                <div>
                  <p className="meta-label">
                    {isEditingSelectedBlock
                      ? 'Editing layout block'
                      : 'Current chord'}
                  </p>
                  <h3>{currentSummary.currentName}</h3>
                </div>
                {isEditingSelectedBlock ? (
                  <div className="editor-mode-controls">
                    <p className="meta-note editor-mode-note editing">
                      {selectedBlockSummary.currentName} を編集中
                    </p>
                    <p className="meta-note">ID: {selectedBlock.id}</p>
                  </div>
                ) : null}
              </div>

              <ChordDiagram
                fretting={currentFretting}
                markerLabels={currentSummary.stringDegreeLabels}
                viewport={currentSummary.viewport}
              />
            </div>

            <div className="manual-builder">
              <div className="manual-builder-header">
                <div>
                  <h3>押弦入力</h3>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => syncManualViewportFromFretting(currentFretting)}
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
                aria-label="押弦入力"
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

                {manualStringEntries.map(({ state, stringIndex, stringNumber }) => (
                  <div
                    className="manual-grid-row"
                    key={`manual-row-${stringIndex}`}
                    style={{ gridTemplateColumns: manualGridTemplate }}
                  >
                    <span className="manual-grid-string">{stringNumber}弦</span>
                    <button
                      aria-label={`${stringNumber}弦 ミュート`}
                      aria-pressed={state === 'x'}
                      className={state === 'x' ? 'active' : ''}
                      onClick={() => setStringState(stringIndex, 'x')}
                      type="button"
                    >
                      X
                    </button>
                    <button
                      aria-label={`${stringNumber}弦 開放`}
                      aria-pressed={state === 0}
                      className={state === 0 ? 'active' : ''}
                      onClick={() => setStringState(stringIndex, 0)}
                      type="button"
                    >
                      O
                    </button>
                    {manualVisibleFrets.map((fret) => (
                      <button
                        aria-label={`${stringNumber}弦 ${fret}フレット`}
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

            </div>
          </div>
        </section>

        <section className="panel info-panel" aria-labelledby="info-heading">
          <div className="panel-heading">
            <h2 id="info-heading">コード情報</h2>
          </div>

          <dl className="info-list">
            <div>
              <dt>現在のコード名</dt>
              <dd>{currentSummary.currentName}</dd>
            </div>
            <div>
              <dt>候補コード名</dt>
              <dd>
                {currentSummary.candidates.length > 0
                  ? currentSummary.candidates
                      .slice(0, 3)
                      .map((candidate) => candidate.label)
                      .join(', ')
                  : '該当なし'}
              </dd>
            </div>
            <div>
              <dt>ベース音</dt>
              <dd>{currentSummary.bassNote ?? '-'}</dd>
            </div>
            <div>
              <dt>構成音</dt>
              <dd>
                {currentSummary.chordTones.length > 0
                  ? currentSummary.chordTones.join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>ユニーク音</dt>
              <dd>
                {currentSummary.uniqueNotes.length > 0
                  ? currentSummary.uniqueNotes.join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>発音音</dt>
              <dd>
                {currentSummary.playedNotes.length > 0
                  ? currentSummary.playedNotes
                      .map((note) => note.note)
                      .join(', ')
                  : '-'}
              </dd>
            </div>
          </dl>
        </section>
      </section>

      <section className="panel stock-panel" aria-labelledby="stock-heading">
        <div className="panel-heading stock-panel-heading">
          <div>
            <h2 id="stock-heading">コードストック</h2>
          </div>
        </div>

        {stockEntries.length > 0 ? (
          <div className="stock-grid">
            {stockEntries.map(({ stockChord, summary }) => (
              <article className="stock-card" key={stockChord.id}>
                <div className="chord-preview-block stock-chord-preview">
                  <h3 className="chord-preview-name">{summary.currentName}</h3>
                  <ChordDiagram
                    compact
                    fretting={stockChord.fretting}
                    markerLabels={summary.stringDegreeLabels}
                    viewport={summary.viewport}
                  />
                </div>

                <div className="stock-card-actions">
                  <button
                    onClick={() => handleAddStockChordToLayout(stockChord.id)}
                    type="button"
                  >
                    選択中の行に追加
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => handleRemoveStockChord(stockChord.id)}
                    type="button"
                  >
                    削除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="stock-empty">
            ストックはまだ空です。コード生成パネルからよく使うコードを追加できます。
          </p>
        )}
      </section>

      <section className="panel layout-panel" aria-labelledby="layout-heading">
        <div className="panel-heading">
          <h2 id="layout-heading">レイアウト編集</h2>
        </div>

        <div className="layout-toolbar">
          <button onClick={handleAddLayoutRow} type="button">
            行を追加
          </button>
          <button
            disabled={layoutRows.length === 1}
            onClick={handleDeleteSelectedLayoutRow}
            type="button"
          >
            選択中の行を削除
          </button>
        </div>

        <div className="layout-row-fields">
          {layoutRows.map((row, index) => (
            <label
              className={`field lyrics-field${
                row.id === selectedLayoutRow.id ? ' active' : ''
              }`}
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

        <div className="layout-toolbar">
          <button
            aria-pressed={isEditingSelectedBlock}
            className="secondary-button"
            onClick={toggleSelectedBlockEditing}
            type="button"
          >
            {isEditingSelectedBlock ? '選択コードの編集を終了' : '選択コードを編集'}
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

        <div className="layout-controls">
          <label className="field small">
            <span>選択コードの配置行</span>
            <select
              aria-label="Block row"
              onChange={handleBlockRowChange}
              value={selectedBlock.rowId}
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
              value={selectedBlock.xOffset}
            />
          </label>

          <label className="field small">
            <span>後続との間隔(px)</span>
            <input
              aria-label="Block spacing"
              min="0"
              onChange={(event) => handleNumberFieldChange('spacing', event)}
              type="number"
              value={selectedBlock.spacing}
            />
          </label>
        </div>

        <div className="layout-stage-wrapper">
          <div
            className="layout-stage"
            ref={layoutStageRef}
            style={layoutStageStyle}
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
                      className={`chord-preview-block layout-chord-block${
                        entry.block.id === selectedBlockId ? ' selected' : ''
                      }`}
                      key={entry.block.id}
                      onClick={() => activateBlock(entry.block)}
                      style={{ left: `${entry.left}px` }}
                      type="button"
                    >
                      <span className="chord-preview-name">
                        {entry.summary.currentName}
                      </span>
                      <ChordDiagram
                        compact
                        fretting={entry.block.fretting}
                        markerLabels={entry.summary.stringDegreeLabels}
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
    let cursor = 16
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

    const chordStageWidth =
      cursor + LAYOUT_ROW_PADDING_INLINE * 2 + LAYOUT_STAGE_PADDING_INLINE * 2
    const lyricStageWidth = Math.max(
      LAYOUT_STAGE_MIN_WIDTH,
      row.lyrics.length * 11 + 80,
    )

    return {
      row,
      entries,
      stageWidth: Math.max(chordStageWidth, lyricStageWidth),
    }
  })

  return {
    rows,
    stageWidth: rows.reduce(
      (maxWidth, rowEntry) => Math.max(maxWidth, rowEntry.stageWidth),
      LAYOUT_STAGE_MIN_WIDTH,
    ),
  }
}

export default App

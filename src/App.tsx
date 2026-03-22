import { useEffect, useRef, useState } from 'react'
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
import { UI_TEXT, type Locale } from './uiText'

const DEFAULT_ROOT: PitchClassName = 'E'
const DEFAULT_QUALITY: ChordQuality = 'major'
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
    displayName: overrides.displayName,
    xOffset: overrides.xOffset ?? 0,
    spacing: overrides.spacing ?? DEFAULT_SPACING,
    rowId,
  }
}

function createStockChord(
  fretting: Fretting,
  displayName?: string,
): StockChordState {
  return {
    id: `stock-${stockSequence++}`,
    fretting,
    displayName,
  }
}

function copyFretting(fretting: Fretting): Fretting {
  return toFretting([...fretting])
}

function isSameFretting(left: Fretting, right: Fretting): boolean {
  return left.every((state, index) => state === right[index])
}

function normalizeDisplayName(value: string | undefined | null): string {
  return value?.trim() ?? ''
}

function toStoredDisplayName(
  value: string | undefined | null,
): string | undefined {
  const normalized = normalizeDisplayName(value)
  return normalized === '' ? undefined : normalized
}

function getDisplayName(
  automaticName: string,
  displayName?: string | null,
): string {
  return normalizeDisplayName(displayName) || automaticName
}

function createInitialAppState() {
  const initialForms = getChordForms(DEFAULT_ROOT, DEFAULT_QUALITY)
  const initialForm = initialForms[0]
  const initialRow = createLayoutRow()
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
  const lyricsInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)
  const [locale, setLocale] = useState<Locale>('ja')

  const [selectedRoot, setSelectedRoot] = useState<PitchClassName>(DEFAULT_ROOT)
  const [selectedQuality, setSelectedQuality] =
    useState<ChordQuality>(DEFAULT_QUALITY)
  const [selectedFormId, setSelectedFormId] = useState(
    initialState.initialFormId,
  )
  const [currentFretting, setCurrentFretting] = useState<Fretting>(() =>
    copyFretting(initialState.initialBlock.fretting),
  )
  const [currentChordName, setCurrentChordName] = useState('')
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
  const [editingLyricsRowId, setEditingLyricsRowId] = useState<string | null>(
    null,
  )
  const text = UI_TEXT[locale]

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
  const activeLayoutRow = layoutRows.find(
    (row) => row.id === selectedBlock.rowId,
  )

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
  const currentDisplayName = getDisplayName(
    currentSummary.currentName,
    currentChordName,
  )
  const selectedBlockDisplayName = getDisplayName(
    selectedBlockSummary.currentName,
    selectedBlock.displayName,
  )
  const stockEntries = stockChords.map((stockChord) => {
    const summary = summarizeChord(stockChord.fretting)

    return {
      stockChord,
      summary,
      displayName: getDisplayName(summary.currentName, stockChord.displayName),
    }
  })
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

  const layoutStagePaddingInline = isExportingPdf
    ? 0
    : LAYOUT_STAGE_PADDING_INLINE
  const layoutRowPaddingInline = isExportingPdf ? 0 : LAYOUT_ROW_PADDING_INLINE
  const layoutEntryStagePaddingInline = LAYOUT_STAGE_PADDING_INLINE
  const layoutEntries = buildLayoutEntries(layoutRows, blocks, {
    rowPaddingInline: layoutRowPaddingInline,
    // Keep the block start position stable so PDF and on-screen lyrics align.
    stagePaddingInline: layoutEntryStagePaddingInline,
  })
  const layoutStageStyle = {
    width: `${layoutEntries.stageWidth}px`,
    '--layout-block-width': `${LAYOUT_BLOCK_WIDTH}px`,
    '--layout-row-padding-inline': `${layoutRowPaddingInline}px`,
    '--layout-stage-padding-inline': `${layoutStagePaddingInline}px`,
  } as CSSProperties

  useEffect(() => {
    if (!editingLyricsRowId) {
      return
    }

    const input = lyricsInputRefs.current[editingLyricsRowId]

    if (!input) {
      return
    }

    input.focus()
    const textLength = input.value.length
    input.setSelectionRange(textLength, textLength)
  }, [editingLyricsRowId])

  function createProjectSnapshot(): ProjectSnapshot {
    return cloneProjectSnapshot({
      selectedRoot,
      selectedQuality,
      selectedFormId,
      currentFretting,
      currentChordName,
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
    setEditingLyricsRowId(null)
    setSelectedRoot(nextSnapshot.selectedRoot)
    setSelectedQuality(nextSnapshot.selectedQuality)
    setSelectedFormId(nextSnapshot.selectedFormId)
    setCurrentFretting(nextSnapshot.currentFretting)
    setCurrentChordName(nextSnapshot.currentChordName)
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
    setEditingLyricsRowId(null)
    setEditingBlockId((currentEditingId) =>
      currentEditingId === block.id ? currentEditingId : null,
    )
  }

  function toggleSelectedBlockEditing() {
    if (isEditingSelectedBlock) {
      setEditingBlockId(null)
      return
    }

    const nextSelectedBlock = blocks.find(
      (block) => block.id === selectedBlockId,
    )

    if (!nextSelectedBlock) {
      return
    }

    const nextFretting = copyFretting(nextSelectedBlock.fretting)
    setCurrentFretting(nextFretting)
    setCurrentChordName(nextSelectedBlock.displayName ?? '')
    syncManualViewportFromFretting(nextFretting)
    setEditingBlockId(selectedBlockId)
  }

  function selectLayoutRow(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    setSelectedLayoutRowId(rowId)
  }

  function startLyricsLineEditing(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    setSelectedLayoutRowId(rowId)
    setEditingLyricsRowId(rowId)
  }

  function updateBlockFretting(blockId: string, fretting: Fretting) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === blockId ? { ...block, fretting } : block,
      ),
    )
  }

  function updateBlockDisplayName(blockId: string, displayName: string) {
    const storedDisplayName = toStoredDisplayName(displayName)

    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === blockId
          ? { ...block, displayName: storedDisplayName }
          : block,
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

  function applyCurrentChordName(nextName: string) {
    setCurrentChordName(nextName)

    if (editingBlockId) {
      updateBlockDisplayName(editingBlockId, nextName)
    }
  }

  function applyGeneratedForm(form: ChordForm) {
    const fretting = copyFretting(form.fretting)
    setSelectedFormId(form.id)
    applyCurrentFretting(fretting)
    syncManualViewportFromFretting(fretting)
  }

  function addBlockToSelectedLayoutRow(
    fretting: Fretting,
    displayName = currentChordName,
  ) {
    const nextBlock = createChordBlock(
      copyFretting(fretting),
      selectedLayoutRow.id,
      {
        displayName: toStoredDisplayName(displayName),
      },
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

  function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === locale) {
      return
    }

    setLocale(nextLocale)
    setAppFeedback(null)
  }

  function handleAddCurrentChordToStock() {
    if (isCurrentChordStocked) {
      setAppFeedback({
        kind: 'success',
        text: text.alreadyStockedFeedback(currentDisplayName),
      })
      return
    }

    const nextStockChord = createStockChord(
      copyFretting(currentFretting),
      toStoredDisplayName(currentChordName),
    )

    setStockChords((currentStockChords) => [
      ...currentStockChords,
      nextStockChord,
    ])
    setAppFeedback({
      kind: 'success',
      text: text.addedToStockFeedback(currentDisplayName),
    })
  }

  function handleAddStockChordToLayout(stockChordId: string) {
    const stockChord = stockChords.find((entry) => entry.id === stockChordId)

    if (!stockChord) {
      return
    }

    addBlockToSelectedLayoutRow(stockChord.fretting, stockChord.displayName)
  }

  function handleRemoveStockChord(stockChordId: string) {
    const stockChord = stockChords.find((entry) => entry.id === stockChordId)

    if (!stockChord) {
      return
    }

    const stockSummary = summarizeChord(stockChord.fretting)
    const stockDisplayName = getDisplayName(
      stockSummary.currentName,
      stockChord.displayName,
    )

    setStockChords((currentStockChords) =>
      currentStockChords.filter((entry) => entry.id !== stockChordId),
    )
    setAppFeedback({
      kind: 'success',
      text: text.removedFromStockFeedback(stockDisplayName),
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
        displayName: nextSelectedBlock.displayName,
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
    setEditingLyricsRowId(null)
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
    const parsed = Number.parseInt(event.currentTarget.value, 10)
    const nextValue = Number.isNaN(parsed)
      ? 0
      : key === 'spacing'
        ? Math.max(0, parsed)
        : parsed

    if (!Number.isNaN(parsed)) {
      event.currentTarget.value = String(nextValue)
    }

    updateSelectedBlock((block) => ({
      ...block,
      [key]: nextValue,
    }))
  }

  function handleCurrentChordNameChange(event: ChangeEvent<HTMLInputElement>) {
    applyCurrentChordName(event.target.value)
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
      text: text.projectExportedFeedback(PROJECT_EXPORT_FILE_NAME),
    })
  }

  async function handlePdfExport() {
    const layoutStageElement = layoutStageRef.current

    if (!layoutStageElement) {
      setAppFeedback({
        kind: 'error',
        text: text.pdfExportFailedMissingStage,
      })
      return
    }

    const activeElement = document.activeElement

    if (
      activeElement instanceof HTMLElement &&
      layoutStageElement.contains(activeElement)
    ) {
      activeElement.blur()
    }

    setEditingLyricsRowId(null)
    setIsExportingPdf(true)

    try {
      await exportLayoutStagePdf(layoutStageElement)
      setAppFeedback({
        kind: 'success',
        text: text.pdfExportedFeedback(LAYOUT_PDF_FILE_NAME),
      })
    } catch (error) {
      setAppFeedback({
        kind: 'error',
        text: text.pdfExportFailed(
          error instanceof Error ? error.message : text.unknownError,
        ),
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
        text: text.projectImportedFeedback(file.name),
      })
    } catch (error) {
      setAppFeedback({
        kind: 'error',
        text: text.importFailed(
          error instanceof Error ? error.message : text.unknownError,
        ),
      })
    } finally {
      input.value = ''
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-header">
          <h1>ChordCanvas</h1>
          <div
            aria-label={text.languageToggleGroupLabel}
            className="language-toggle"
            role="group"
          >
            <button
              aria-pressed={locale === 'ja'}
              className="secondary-button"
              onClick={() => handleLocaleChange('ja')}
              type="button"
            >
              {text.languageJa}
            </button>
            <button
              aria-pressed={locale === 'en'}
              className="secondary-button"
              onClick={() => handleLocaleChange('en')}
              type="button"
            >
              {text.languageEn}
            </button>
          </div>
        </div>

        <div className="hero-actions">
          <div className="project-actions">
            <button
              className="secondary-button"
              disabled={isExportingPdf}
              onClick={handlePdfExport}
              type="button"
            >
              {isExportingPdf ? text.exportingPdf : text.exportPdf}
            </button>
            <button
              className="secondary-button"
              onClick={handleProjectExport}
              type="button"
            >
              {text.exportProject}
            </button>
            <button
              className="secondary-button"
              onClick={openProjectFilePicker}
              type="button"
            >
              {text.importProject}
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
            <h2 id="generator-heading">{text.generatorHeading}</h2>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>{text.rootNote}</span>
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
              <span>{text.chordQuality}</span>
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
              <span>{text.chordForm}</span>
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
              {text.addCurrentChord}
            </button>
            <button
              disabled={isCurrentChordStocked}
              onClick={handleAddCurrentChordToStock}
              type="button"
            >
              {isCurrentChordStocked
                ? text.alreadyStockedButton
                : text.addToStock}
            </button>
          </div>
        </section>

        <section
          className="panel editor-panel"
          aria-labelledby="editor-heading"
        >
          <div className="panel-heading">
            <h2 id="editor-heading">{text.editorHeading}</h2>
          </div>

          <div className="editor-content">
            <div className="diagram-card">
              <div className="diagram-card-header">
                <div>
                  {isEditingSelectedBlock ? (
                    <p className="meta-label">{text.editingLayoutBlock}</p>
                  ) : null}
                  <h3>{currentDisplayName}</h3>
                  <label className="field small diagram-name-field">
                    <span>{text.displayChordName}</span>
                    <input
                      aria-label="Chord name"
                      onChange={handleCurrentChordNameChange}
                      placeholder={currentSummary.currentName}
                      type="text"
                      value={currentChordName}
                    />
                  </label>
                  <p className="meta-note">{text.useAutoDetectedName}</p>
                </div>
                {isEditingSelectedBlock ? (
                  <div className="editor-mode-controls">
                    <p className="meta-note editor-mode-note editing">
                      {text.editingBlockNotice(selectedBlockDisplayName)}
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
                  <h3>{text.frettingInput}</h3>
                </div>
                <button
                  className="secondary-button"
                  onClick={() =>
                    syncManualViewportFromFretting(currentFretting)
                  }
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
                    onChange={handleManualStartFretChange}
                    type="number"
                    value={manualStartFret}
                  />
                </label>

                <label className="field small">
                  <span>{text.visibleFretCount}</span>
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
                aria-label={text.frettingInput}
                className="manual-grid"
                role="group"
              >
                {manualStringEntries.map(
                  ({ state, stringIndex, stringNumber }) => (
                    <div
                      className="manual-grid-row"
                      key={`manual-row-${stringIndex}`}
                      style={{ gridTemplateColumns: manualGridTemplate }}
                    >
                      <span className="manual-grid-string">
                        {text.stringLabel(stringNumber)}
                      </span>
                      <button
                        aria-label={text.stringMuteLabel(stringNumber)}
                        aria-pressed={state === 'x'}
                        className={state === 'x' ? 'active' : ''}
                        onClick={() => setStringState(stringIndex, 'x')}
                        type="button"
                      >
                        X
                      </button>
                      <button
                        aria-label={text.stringOpenLabel(stringNumber)}
                        aria-pressed={state === 0}
                        className={state === 0 ? 'active' : ''}
                        onClick={() => setStringState(stringIndex, 0)}
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
                          onClick={() => setStringState(stringIndex, fret)}
                          type="button"
                        >
                          {fret}
                        </button>
                      ))}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="panel info-panel" aria-labelledby="info-heading">
          <div className="panel-heading">
            <h2 id="info-heading">{text.infoHeading}</h2>
          </div>

          <dl className="info-list">
            <div>
              <dt>{text.currentChordName}</dt>
              <dd>{currentDisplayName}</dd>
            </div>
            <div>
              <dt>{text.candidateChordNames}</dt>
              <dd>
                {currentSummary.candidates.length > 0
                  ? currentSummary.candidates
                      .slice(0, 3)
                      .map((candidate) => candidate.label)
                      .join(', ')
                  : text.noCandidates}
              </dd>
            </div>
            <div>
              <dt>{text.bassNote}</dt>
              <dd>{currentSummary.bassNote ?? '-'}</dd>
            </div>
            <div>
              <dt>{text.chordTones}</dt>
              <dd>
                {currentSummary.chordTones.length > 0
                  ? currentSummary.chordTones.join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>{text.uniqueNotes}</dt>
              <dd>
                {currentSummary.uniqueNotes.length > 0
                  ? currentSummary.uniqueNotes.join(', ')
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>{text.playedNotes}</dt>
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
            <h2 id="stock-heading">{text.stockHeading}</h2>
          </div>
        </div>

        {stockEntries.length > 0 ? (
          <div className="stock-grid">
            {stockEntries.map(({ stockChord, summary, displayName }) => (
              <article className="stock-card" key={stockChord.id}>
                <div className="chord-preview-block stock-chord-preview">
                  <h3 className="chord-preview-name">{displayName}</h3>
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
                    {text.addToSelectedRow}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => handleRemoveStockChord(stockChord.id)}
                    type="button"
                  >
                    {text.delete}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="stock-empty">{text.stockEmpty}</p>
        )}
      </section>

      <section className="panel layout-panel" aria-labelledby="layout-heading">
        <div className="panel-heading">
          <h2 id="layout-heading">{text.layoutHeading}</h2>
        </div>

        <div className="layout-toolbar">
          <button onClick={handleAddLayoutRow} type="button">
            {text.addRow}
          </button>
          <button
            disabled={layoutRows.length === 1}
            onClick={handleDeleteSelectedLayoutRow}
            type="button"
          >
            {text.deleteSelectedRow}
          </button>
        </div>

        <div className="layout-toolbar">
          <button
            aria-pressed={isEditingSelectedBlock}
            className="secondary-button"
            onClick={toggleSelectedBlockEditing}
            type="button"
          >
            {isEditingSelectedBlock
              ? text.finishEditingSelectedChord
              : text.editSelectedChord}
          </button>
          <button onClick={handleDuplicateBlock} type="button">
            {text.duplicateSelectedChord}
          </button>
          <button
            disabled={blocks.length === 1}
            onClick={handleDeleteBlock}
            type="button"
          >
            {text.deleteSelectedChord}
          </button>
          <button
            disabled={activeRowSelectionIndex <= 0}
            onClick={() => handleMoveBlock(-1)}
            type="button"
          >
            {text.moveLeft}
          </button>
          <button
            disabled={
              activeRowSelectionIndex < 0 ||
              activeRowSelectionIndex === activeRowBlockIds.length - 1
            }
            onClick={() => handleMoveBlock(1)}
            type="button"
          >
            {text.moveRight}
          </button>
        </div>

        <div className="layout-controls">
          <label className="field small">
            <span>{text.selectedChordRow}</span>
            <select
              aria-label="Block row"
              onChange={handleBlockRowChange}
              value={selectedBlock.rowId}
            >
              {layoutRows.map((row, index) => (
                <option key={row.id} value={row.id}>
                  {text.layoutRowLabel(index)}
                </option>
              ))}
            </select>
          </label>

          <label className="field small">
            <span>{text.horizontalOffset}</span>
            <input
              aria-label="Block horizontal offset"
              onChange={(event) => handleNumberFieldChange('xOffset', event)}
              type="number"
              value={selectedBlock.xOffset}
            />
          </label>

          <label className="field small">
            <span>{text.spacingAfter}</span>
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
            {layoutEntries.rows.map((rowEntry, index) => {
              const rowLabel = text.layoutRowLabel(index)
              const lyricsLineLabel = text.lyricsLineLabel(index)
              const showLyricsPlaceholder =
                rowEntry.row.lyrics === '' && !isExportingPdf

              return (
                <section
                  aria-labelledby={`layout-row-heading-${rowEntry.row.id}`}
                  className={`layout-row${
                    rowEntry.row.id === selectedLayoutRow.id ? ' selected' : ''
                  }`}
                  key={rowEntry.row.id}
                >
                  <div className="layout-row-header">
                    <h3 id={`layout-row-heading-${rowEntry.row.id}`}>
                      {rowLabel}
                    </h3>
                    <button
                      aria-label={text.setInsertionTargetAria(rowLabel)}
                      aria-pressed={rowEntry.row.id === selectedLayoutRow.id}
                      className="layout-row-selector"
                      onClick={() => selectLayoutRow(rowEntry.row.id)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="layout-row-selector-indicator"
                      />
                    </button>
                  </div>

                  <div className="layout-chord-layer">
                    {rowEntry.entries.map((entry) => (
                      <button
                        aria-label={`Select ${entry.displayName} block`}
                        className={`chord-preview-block layout-chord-block${
                          entry.block.id === selectedBlockId ? ' selected' : ''
                        }`}
                        key={entry.block.id}
                        onClick={() => activateBlock(entry.block)}
                        style={{ left: `${entry.left}px` }}
                        type="button"
                      >
                        <span className="chord-preview-name">
                          {entry.displayName}
                        </span>
                        <ChordDiagram
                          compact
                          fretting={entry.block.fretting}
                          markerLabels={entry.summary.stringDegreeLabels}
                          pdfExport={isExportingPdf}
                          tightTopSpacing
                          viewport={entry.summary.viewport}
                        />
                      </button>
                    ))}
                  </div>

                  {isExportingPdf || editingLyricsRowId !== rowEntry.row.id ? (
                    <div
                      aria-label={lyricsLineLabel}
                      className={`lyrics-line lyrics-line-text${
                        showLyricsPlaceholder ? ' lyrics-line-placeholder' : ''
                      }`}
                      onClick={() => startLyricsLineEditing(rowEntry.row.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          startLyricsLineEditing(rowEntry.row.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {showLyricsPlaceholder
                        ? text.lyricsPlaceholder
                        : rowEntry.row.lyrics || '\u00a0'}
                    </div>
                  ) : (
                    <input
                      aria-label={lyricsLineLabel}
                      className="lyrics-line lyrics-line-input"
                      onBlur={() => setEditingLyricsRowId(null)}
                      onChange={(event) =>
                        handleLyricsLineChange(rowEntry.row.id, event)
                      }
                      placeholder={text.lyricsPlaceholder}
                      onFocus={() => selectLayoutRow(rowEntry.row.id)}
                      ref={(node) => {
                        lyricsInputRefs.current[rowEntry.row.id] = node
                      }}
                      type="text"
                      value={rowEntry.row.lyrics}
                    />
                  )}
                </section>
              )
            })}
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
  {
    rowPaddingInline = LAYOUT_ROW_PADDING_INLINE,
    stagePaddingInline = LAYOUT_STAGE_PADDING_INLINE,
  }: {
    rowPaddingInline?: number
    stagePaddingInline?: number
  } = {},
) {
  const rows = layoutRows.map((row) => {
    let cursor = stagePaddingInline
    let nextFlowLeft = stagePaddingInline
    let minLeft = 0
    const entries = blocks
      .filter((block) => block.rowId === row.id)
      .map((block) => {
        const summary = summarizeChord(block.fretting)
        const displayName = getDisplayName(
          summary.currentName,
          block.displayName,
        )
        const flowLeft = Math.max(cursor, nextFlowLeft)
        const left = Math.max(minLeft, flowLeft + block.xOffset)
        minLeft = left + LAYOUT_BLOCK_WIDTH
        nextFlowLeft = minLeft + block.spacing
        cursor += LAYOUT_SLOT_WIDTH + block.spacing

        return {
          block,
          summary,
          displayName,
          left,
        }
      })

    const chordLayerWidth = Math.max(cursor, nextFlowLeft)
    const chordStageWidth =
      chordLayerWidth + rowPaddingInline * 2 + stagePaddingInline * 2
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

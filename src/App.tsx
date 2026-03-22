import { useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import ChordComposer from './components/ChordComposer'
import ChordDiagram from './components/ChordDiagram'
import { exportLayoutStagePdf, LAYOUT_PDF_FILE_NAME } from './export/layoutPdf'
import {
  MINIMUM_DIAGRAM_FRET_COUNT,
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
const LAYOUT_ADD_BUTTON_WIDTH = 72
const MIN_MANUAL_FRET_COUNT = MINIMUM_DIAGRAM_FRET_COUNT
const MAX_MANUAL_FRET_COUNT = 12
const PROJECT_EXPORT_FILE_NAME = 'chordcanvas-project.json'

interface AppFeedback {
  kind: 'success' | 'error'
  text: string
}

interface LayoutBlockDragState {
  blockId: string
  hasFollowingBlock: boolean
  minXOffset: number
  pointerId: number
  startSpacing: number
  startClientX: number
  startXOffset: number
}

interface ChordDraftState {
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  fretting: Fretting
  chordName: string
  manualStartFret: number
  manualFretCount: number
}

type ChordModalState =
  | {
      kind: 'stock'
      draft: ChordDraftState
    }
  | {
      kind: 'layout'
      draft: ChordDraftState
      targetRowId: string
    }
  | {
      blockId: string
      draft: ChordDraftState
      kind: 'edit'
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
  const [editingLyricsRowId, setEditingLyricsRowId] = useState<string | null>(
    null,
  )
  const [chordModal, setChordModal] = useState<ChordModalState | null>(null)
  const layoutBlockDragStateRef = useRef<LayoutBlockDragState | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const text = UI_TEXT[locale]

  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? blocks[0]

  if (!selectedBlock) {
    throw new Error('At least one chord block must be present')
  }

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
  const layoutStagePaddingInline = isExportingPdf
    ? 0
    : LAYOUT_STAGE_PADDING_INLINE
  const layoutRowPaddingInline = isExportingPdf ? 0 : LAYOUT_ROW_PADDING_INLINE
  const layoutEntryStagePaddingInline = LAYOUT_STAGE_PADDING_INLINE
  const layoutEntries = buildLayoutEntries(layoutRows, blocks, {
    rowPaddingInline: layoutRowPaddingInline,
    stagePaddingInline: layoutEntryStagePaddingInline,
  })
  const layoutStageStyle = {
    width: `${layoutEntries.stageWidth}px`,
    '--layout-block-width': `${LAYOUT_BLOCK_WIDTH}px`,
    '--layout-row-padding-inline': `${layoutRowPaddingInline}px`,
    '--layout-stage-padding-inline': `${layoutStagePaddingInline}px`,
  } as CSSProperties

  const modalDraft = chordModal?.draft ?? null
  const modalAvailableForms = modalDraft
    ? getChordForms(modalDraft.selectedRoot, modalDraft.selectedQuality)
    : []
  const modalSummary = modalDraft ? summarizeChord(modalDraft.fretting) : null
  const modalDisplayName =
    modalDraft && modalSummary
      ? getDisplayName(modalSummary.currentName, modalDraft.chordName)
      : ''
  const modalVisibleFrets = modalDraft
    ? createVisibleFrets(modalDraft.manualStartFret, modalDraft.manualFretCount)
    : []
  const modalManualGridTemplate = `36px 36px 36px repeat(${modalVisibleFrets.length}, minmax(0, 1fr))`
  const modalManualStringEntries = modalDraft
    ? modalDraft.fretting
        .map((state, stringIndex) => ({
          state,
          stringIndex,
          stringNumber: 6 - stringIndex,
        }))
        .reverse()
    : []
  const modalRowLabel =
    chordModal && chordModal.kind === 'layout'
      ? getLayoutRowLabel(layoutRows, chordModal.targetRowId, text)
      : null
  const isModalChordStocked =
    chordModal?.kind === 'stock' && modalDraft
      ? stockChords.some((stockChord) =>
          isSameFretting(stockChord.fretting, modalDraft.fretting),
        )
      : false

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

  useEffect(() => {
    if (!draggingBlockId) {
      return
    }

    function handlePointerMove(event: PointerEvent) {
      const dragState = layoutBlockDragStateRef.current

      if (!dragState || event.pointerId !== dragState.pointerId) {
        return
      }

      const deltaX = Math.round(event.clientX - dragState.startClientX)
      const appliedDeltaX = Math.max(
        dragState.minXOffset,
        dragState.startXOffset + deltaX,
      ) - dragState.startXOffset
      const nextXOffset = dragState.startXOffset + appliedDeltaX
      const nextSpacing = dragState.hasFollowingBlock
        ? appliedDeltaX > 0
          ? Math.max(0, dragState.startSpacing - appliedDeltaX)
          : dragState.startSpacing
        : dragState.startSpacing

      updateBlockById(dragState.blockId, (block) =>
        block.xOffset === nextXOffset && block.spacing === nextSpacing
          ? block
          : {
              ...block,
              xOffset: nextXOffset,
              spacing: nextSpacing,
            },
      )
    }

    function finishDragging(event: PointerEvent) {
      const dragState = layoutBlockDragStateRef.current

      if (!dragState || event.pointerId !== dragState.pointerId) {
        return
      }

      layoutBlockDragStateRef.current = null
      setDraggingBlockId(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishDragging)
    window.addEventListener('pointercancel', finishDragging)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishDragging)
      window.removeEventListener('pointercancel', finishDragging)
    }
  }, [draggingBlockId])

  useEffect(() => {
    if (!chordModal) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setChordModal(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [chordModal])

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
    setEditingLyricsRowId(null)
    setChordModal(null)
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

  function activateBlock(block: ChordBlockState) {
    setSelectedBlockId(block.id)
    setSelectedLayoutRowId(block.rowId)
    setEditingLyricsRowId(null)
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

  function updateBlockById(
    blockId: string,
    updater: (block: ChordBlockState) => ChordBlockState,
  ) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === blockId ? updater(block) : block,
      ),
    )
  }

  function commitChordDraft(draft: ChordDraftState) {
    setSelectedRoot(draft.selectedRoot)
    setSelectedQuality(draft.selectedQuality)
    setSelectedFormId(draft.selectedFormId)
    setCurrentFretting(copyFretting(draft.fretting))
    setCurrentChordName(draft.chordName)
    setManualStartFret(Math.max(1, draft.manualStartFret))
    setManualFretCount(clampManualFretCount(draft.manualFretCount))
  }

  function updateChordModalDraft(
    updater: (draft: ChordDraftState) => ChordDraftState,
  ) {
    setChordModal((currentModal) => {
      if (!currentModal) {
        return currentModal
      }

      return {
        ...currentModal,
        draft: updater(currentModal.draft),
      }
    })
  }

  function openStockChordModal() {
    setChordModal({
      kind: 'stock',
      draft: createChordDraft({
        currentChordName,
        currentFretting,
        manualFretCount,
        manualStartFret,
        selectedFormId,
        selectedQuality,
        selectedRoot,
      }),
    })
  }

  function openLayoutChordModal(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    setSelectedLayoutRowId(rowId)
    setEditingLyricsRowId(null)
    setChordModal({
      kind: 'layout',
      draft: createChordDraft({
        currentChordName,
        currentFretting,
        manualFretCount,
        manualStartFret,
        selectedFormId,
        selectedQuality,
        selectedRoot,
      }),
      targetRowId: rowId,
    })
  }

  function openEditChordModal() {
    const blockToEdit = blocks.find((block) => block.id === selectedBlockId)

    if (!blockToEdit) {
      return
    }

    setChordModal({
      blockId: blockToEdit.id,
      draft: createChordDraftFromBlock(blockToEdit, {
        selectedFormId,
        selectedQuality,
        selectedRoot,
      }),
      kind: 'edit',
    })
  }

  function handleChordModalRootChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRoot = event.target.value as PitchClassName

    updateChordModalDraft((draft) => {
      const nextForms = getChordForms(nextRoot, draft.selectedQuality)
      const nextForm = nextForms[0]
      const nextFretting = nextForm
        ? copyFretting(nextForm.fretting)
        : draft.fretting

      return syncDraftViewport({
        ...draft,
        selectedFormId: nextForm?.id ?? '',
        selectedRoot: nextRoot,
      }, nextFretting)
    })
  }

  function handleChordModalQualityChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextQuality = event.target.value as ChordQuality

    updateChordModalDraft((draft) => {
      const nextForms = getChordForms(draft.selectedRoot, nextQuality)
      const nextForm = nextForms[0]
      const nextFretting = nextForm
        ? copyFretting(nextForm.fretting)
        : draft.fretting

      return syncDraftViewport({
        ...draft,
        selectedFormId: nextForm?.id ?? '',
        selectedQuality: nextQuality,
      }, nextFretting)
    })
  }

  function handleChordModalFormChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextFormId = event.target.value

    updateChordModalDraft((draft) => {
      const nextForm = getChordForms(
        draft.selectedRoot,
        draft.selectedQuality,
      ).find((form) => form.id === nextFormId)

      if (!nextForm) {
        return draft
      }

      return syncDraftViewport(
        {
          ...draft,
          selectedFormId: nextForm.id,
        },
        nextForm.fretting,
      )
    })
  }

  function handleChordModalNameChange(event: ChangeEvent<HTMLInputElement>) {
    const nextName = event.target.value

    updateChordModalDraft((draft) => ({
      ...draft,
      chordName: nextName,
    }))
  }

  function handleChordModalManualStartFretChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const parsed = Number.parseInt(event.target.value, 10)

    updateChordModalDraft((draft) => ({
      ...draft,
      manualStartFret: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
    }))
  }

  function handleChordModalManualFretCountChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const parsed = Number.parseInt(event.target.value, 10)

    updateChordModalDraft((draft) => ({
      ...draft,
      manualFretCount: Number.isNaN(parsed)
        ? MIN_MANUAL_FRET_COUNT
        : clampManualFretCount(parsed),
    }))
  }

  function handleChordModalStringStateChange(
    stringIndex: number,
    nextState: StringState,
  ) {
    updateChordModalDraft((draft) => {
      const nextFretting = [...draft.fretting]
      nextFretting[stringIndex] = nextState

      return {
        ...draft,
        fretting: toFretting(nextFretting),
      }
    })
  }

  function handleChordModalViewportSync() {
    updateChordModalDraft((draft) => syncDraftViewport(draft, draft.fretting))
  }

  function addBlockToLayoutRow(
    rowId: string,
    fretting: Fretting,
    displayName?: string,
  ) {
    const nextBlock = createChordBlock(copyFretting(fretting), rowId, {
      displayName: toStoredDisplayName(displayName),
    })

    setBlocks((currentBlocks) => {
      const insertionIndex = getInsertionIndexForRow(
        currentBlocks,
        layoutRows,
        rowId,
      )

      return [
        ...currentBlocks.slice(0, insertionIndex),
        nextBlock,
        ...currentBlocks.slice(insertionIndex),
      ]
    })
    activateBlock(nextBlock)
  }

  function closeChordModal() {
    setChordModal(null)
  }

  function handleSubmitChordModal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!chordModal) {
      return
    }

    const { draft } = chordModal
    const draftSummary = summarizeChord(draft.fretting)
    const draftDisplayName = getDisplayName(
      draftSummary.currentName,
      draft.chordName,
    )

    if (chordModal.kind === 'stock') {
      if (isModalChordStocked) {
        setAppFeedback({
          kind: 'success',
          text: text.alreadyStockedFeedback(draftDisplayName),
        })
        return
      }

      commitChordDraft(draft)
      setStockChords((currentStockChords) => [
        ...currentStockChords,
        createStockChord(
          copyFretting(draft.fretting),
          toStoredDisplayName(draft.chordName),
        ),
      ])
      setAppFeedback({
        kind: 'success',
        text: text.addedToStockFeedback(draftDisplayName),
      })
      closeChordModal()
      return
    }

    if (chordModal.kind === 'layout') {
      commitChordDraft(draft)
      addBlockToLayoutRow(
        chordModal.targetRowId,
        draft.fretting,
        draft.chordName,
      )
      closeChordModal()
      return
    }

    const blockToEdit = blocks.find((block) => block.id === chordModal.blockId)

    if (!blockToEdit) {
      closeChordModal()
      return
    }

    commitChordDraft(draft)
    updateBlockById(chordModal.blockId, (block) => ({
      ...block,
      displayName: toStoredDisplayName(draft.chordName),
      fretting: copyFretting(draft.fretting),
    }))
    activateBlock({
      ...blockToEdit,
      displayName: toStoredDisplayName(draft.chordName),
      fretting: copyFretting(draft.fretting),
    })
    closeChordModal()
  }

  function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === locale) {
      return
    }

    setLocale(nextLocale)
    setAppFeedback(null)
  }

  function handleAddStockChordToLayout(stockChordId: string, rowId?: string) {
    const stockChord = stockChords.find((entry) => entry.id === stockChordId)

    if (!stockChord) {
      return
    }

    addBlockToLayoutRow(
      rowId ?? selectedLayoutRow.id,
      stockChord.fretting,
      stockChord.displayName,
    )
  }

  function handleAddStockChordFromModal(stockChordId: string) {
    if (!chordModal || chordModal.kind !== 'layout') {
      return
    }

    handleAddStockChordToLayout(stockChordId, chordModal.targetRowId)
    closeChordModal()
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
        spacing: nextSelectedBlock.spacing,
        xOffset: nextSelectedBlock.xOffset,
      },
    )

    setBlocks((currentBlocks) => {
      const before = currentBlocks.slice(0, selectedIndex + 1)
      const after = currentBlocks.slice(selectedIndex + 1)
      return [...before, nextBlock, ...after]
    })
    activateBlock(nextBlock)
  }

  function handleDeleteBlock(blockId = selectedBlockId) {
    if (blocks.length === 1) {
      return
    }

    const blockIndex = blocks.findIndex((block) => block.id === blockId)

    if (blockIndex < 0) {
      return
    }

    const nextBlocks = blocks.filter((block) => block.id !== blockId)

    if (blockId !== selectedBlockId) {
      setBlocks(nextBlocks)
      return
    }

    const fallbackIndex = Math.max(0, blockIndex - 1)
    const fallbackBlock = nextBlocks[fallbackIndex] ?? nextBlocks[0]

    if (!fallbackBlock) {
      return
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

  function handleDeleteLayoutRow(rowId: string) {
    if (layoutRows.length === 1) {
      return
    }

    const selectedRowIndex = layoutRows.findIndex((row) => row.id === rowId)
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
    if (
      selectedLayoutRowId === rowToRemove.id ||
      selectedBlock.rowId === rowToRemove.id
    ) {
      setSelectedLayoutRowId(fallbackRow.id)
    }
    if (editingLyricsRowId === rowToRemove.id) {
      setEditingLyricsRowId(null)
    }
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

  function handleLayoutBlockPointerDown(
    block: ChordBlockState,
    hasFollowingBlock: boolean,
    minXOffset: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    activateBlock(block)
    layoutBlockDragStateRef.current = {
      blockId: block.id,
      hasFollowingBlock,
      minXOffset,
      pointerId: event.pointerId,
      startSpacing: block.spacing,
      startClientX: event.clientX,
      startXOffset: block.xOffset,
    }
    setDraggingBlockId(block.id)
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

  const modalTitle = chordModal
    ? chordModal.kind === 'stock'
      ? text.chordBuilderModalTitle
      : chordModal.kind === 'layout'
        ? text.layoutAddModalTitle(modalRowLabel ?? text.layoutHeading)
        : text.layoutEditModalTitle
    : ''
  const modalSubmitLabel = chordModal
    ? chordModal.kind === 'stock'
      ? isModalChordStocked
        ? text.alreadyStockedButton
        : text.addToStock
      : chordModal.kind === 'layout'
        ? text.addToRow(modalRowLabel ?? text.layoutHeading)
        : text.saveChordChanges
    : ''

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

      <section className="panel stock-panel" aria-labelledby="stock-heading">
        <div className="panel-heading stock-panel-heading">
          <div>
            <h2 id="stock-heading">{text.stockHeading}</h2>
          </div>
          <button
            aria-label={text.openStockAddModal}
            className="panel-icon-button"
            onClick={openStockChordModal}
            type="button"
          >
            +
          </button>
        </div>

        {stockEntries.length > 0 ? (
          <div className="stock-grid">
            {stockEntries.map(({ stockChord, summary, displayName }) => (
              <article className="stock-card dismissible-card" key={stockChord.id}>
                <button
                  aria-label={text.removeStockChordAria(displayName)}
                  className="card-dismiss-button"
                  onClick={() => handleRemoveStockChord(stockChord.id)}
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
                    viewport={summary.viewport}
                  />
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
          <button
            className="secondary-button"
            onClick={openEditChordModal}
            type="button"
          >
            {text.editSelectedChord}
          </button>
          <button onClick={handleDuplicateBlock} type="button">
            {text.duplicateSelectedChord}
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
        </div>

        <p className="layout-drag-hint">{text.layoutDragHint}</p>

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
                      aria-label={text.removeLayoutRowAria(rowLabel)}
                      className="layout-row-delete-button"
                      disabled={layoutRows.length === 1}
                      onClick={() => handleDeleteLayoutRow(rowEntry.row.id)}
                      type="button"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>

                  <div className="layout-chord-layer">
                    {rowEntry.entries.map((entry) => (
                      <div
                        className={`layout-chord-block dismissible-card${
                          entry.block.id === selectedBlockId ? ' selected' : ''
                        }`}
                        data-dragging={
                          draggingBlockId === entry.block.id ? 'true' : undefined
                        }
                        key={entry.block.id}
                        style={{ left: `${entry.left}px` }}
                      >
                        <button
                          aria-label={text.removeLayoutChordAria(
                            entry.displayName,
                          )}
                          className="card-dismiss-button"
                          disabled={blocks.length === 1}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDeleteBlock(entry.block.id)
                          }}
                          type="button"
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                        <button
                          aria-label={`Select ${entry.displayName} block`}
                          className="chord-preview-block layout-chord-block-button"
                          draggable={false}
                          onClick={() => activateBlock(entry.block)}
                          onPointerDown={(event) =>
                            handleLayoutBlockPointerDown(
                              entry.block,
                              entry.hasFollowingBlock,
                              entry.minXOffset,
                              event,
                            )
                          }
                          title={text.layoutDragHint}
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
                      </div>
                    ))}

                    <button
                      aria-label={text.openLayoutAddModal(rowLabel)}
                      className="layout-add-button"
                      onClick={() => openLayoutChordModal(rowEntry.row.id)}
                      style={{ left: `${rowEntry.addButtonLeft}px` }}
                      type="button"
                    >
                      +
                    </button>
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
                      onFocus={() => selectLayoutRow(rowEntry.row.id)}
                      placeholder={text.lyricsPlaceholder}
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

            <button
              aria-label={text.addRow}
              className="layout-row-add-button"
              onClick={handleAddLayoutRow}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      </section>

      {chordModal && modalDraft && modalSummary ? (
        <div
          className="modal-overlay"
          onClick={closeChordModal}
          role="presentation"
        >
          <div
            aria-labelledby="chord-modal-heading"
            aria-modal="true"
            className="chord-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="chord-modal-header">
              <div>
                {chordModal.kind === 'edit' ? (
                  <p className="meta-label">{text.editSelectedChord}</p>
                ) : null}
                <h2 id="chord-modal-heading">{modalTitle}</h2>
                {chordModal.kind === 'edit' ? (
                  <p className="meta-note">
                    {text.editingBlockNotice(selectedBlockDisplayName)}
                  </p>
                ) : null}
              </div>
              <button
                aria-label={text.modalClose}
                className="panel-icon-button"
                onClick={closeChordModal}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="chord-modal-form" onSubmit={handleSubmitChordModal}>
              <ChordComposer
                availableForms={modalAvailableForms}
                chordName={modalDraft.chordName}
                displayName={modalDisplayName}
                fretting={modalDraft.fretting}
                manualFretCount={modalDraft.manualFretCount}
                manualGridTemplate={modalManualGridTemplate}
                manualStartFret={modalDraft.manualStartFret}
                manualStringEntries={modalManualStringEntries}
                manualVisibleFrets={modalVisibleFrets}
                maxManualFretCount={MAX_MANUAL_FRET_COUNT}
                minManualFretCount={MIN_MANUAL_FRET_COUNT}
                onChordNameChange={handleChordModalNameChange}
                onFormChange={handleChordModalFormChange}
                onManualFretCountChange={handleChordModalManualFretCountChange}
                onManualStartFretChange={handleChordModalManualStartFretChange}
                onQualityChange={handleChordModalQualityChange}
                onRootChange={handleChordModalRootChange}
                onStringStateChange={handleChordModalStringStateChange}
                onViewportSync={handleChordModalViewportSync}
                selectedFormId={modalDraft.selectedFormId}
                selectedQuality={modalDraft.selectedQuality}
                selectedRoot={modalDraft.selectedRoot}
                summary={modalSummary}
                text={text}
              />

              {chordModal.kind === 'layout' ? (
                <section
                  aria-labelledby="modal-stock-heading"
                  className="composer-section modal-stock-section"
                >
                  <div className="panel-heading">
                    <h2 id="modal-stock-heading">{text.stockHeading}</h2>
                  </div>

                  {stockEntries.length > 0 ? (
                    <div className="stock-grid modal-stock-grid">
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
                              onClick={() =>
                                handleAddStockChordFromModal(stockChord.id)
                              }
                              type="button"
                            >
                              {text.addToRow(modalRowLabel ?? text.layoutHeading)}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="stock-empty">{text.stockEmpty}</p>
                  )}
                </section>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={closeChordModal}
                  type="button"
                >
                  {text.modalClose}
                </button>
                <button
                  disabled={chordModal.kind === 'stock' && isModalChordStocked}
                  type="submit"
                >
                  {modalSubmitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function clampManualFretCount(value: number): number {
  return Math.min(MAX_MANUAL_FRET_COUNT, Math.max(MIN_MANUAL_FRET_COUNT, value))
}

function createVisibleFrets(startFret: number, fretCount: number): number[] {
  return Array.from({ length: fretCount }, (_, index) => startFret + index)
}

function createChordDraft({
  selectedRoot,
  selectedQuality,
  selectedFormId,
  currentFretting,
  currentChordName,
  manualStartFret,
  manualFretCount,
}: {
  selectedRoot: PitchClassName
  selectedQuality: ChordQuality
  selectedFormId: string
  currentFretting: Fretting
  currentChordName: string
  manualStartFret: number
  manualFretCount: number
}): ChordDraftState {
  return {
    chordName: currentChordName,
    fretting: copyFretting(currentFretting),
    manualFretCount: clampManualFretCount(manualFretCount),
    manualStartFret: Math.max(1, manualStartFret),
    selectedFormId,
    selectedQuality,
    selectedRoot,
  }
}

function createChordDraftFromBlock(
  block: ChordBlockState,
  {
    selectedRoot,
    selectedQuality,
    selectedFormId,
  }: {
    selectedRoot: PitchClassName
    selectedQuality: ChordQuality
    selectedFormId: string
  },
): ChordDraftState {
  const viewport = summarizeChord(block.fretting).viewport

  return {
    chordName: block.displayName ?? '',
    fretting: copyFretting(block.fretting),
    manualFretCount: clampManualFretCount(viewport.fretCount),
    manualStartFret: viewport.startFret,
    selectedFormId,
    selectedQuality,
    selectedRoot,
  }
}

function syncDraftViewport(
  draft: ChordDraftState,
  fretting: Fretting,
): ChordDraftState {
  const viewport = summarizeChord(fretting).viewport

  return {
    ...draft,
    fretting: copyFretting(fretting),
    manualFretCount: clampManualFretCount(viewport.fretCount),
    manualStartFret: viewport.startFret,
  }
}

function getLayoutRowLabel(
  layoutRows: readonly LayoutRowState[],
  rowId: string,
  text: (typeof UI_TEXT)[Locale],
): string {
  const rowIndex = layoutRows.findIndex((row) => row.id === rowId)

  return text.layoutRowLabel(rowIndex < 0 ? 0 : rowIndex)
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
        const minXOffset = minLeft - flowLeft
        const left = Math.max(minLeft, flowLeft + block.xOffset)
        minLeft = left + LAYOUT_BLOCK_WIDTH
        nextFlowLeft = minLeft + block.spacing
        cursor += LAYOUT_SLOT_WIDTH + block.spacing

        return {
          block,
          summary,
          displayName,
          hasFollowingBlock: false,
          left,
          minXOffset,
        }
      })

    entries.forEach((entry, index) => {
      entry.hasFollowingBlock = index < entries.length - 1
    })

    const addButtonLeft = Math.max(cursor, nextFlowLeft)
    const chordLayerWidth = Math.max(
      cursor,
      nextFlowLeft + LAYOUT_ADD_BUTTON_WIDTH,
    )
    const chordStageWidth =
      chordLayerWidth + rowPaddingInline * 2 + stagePaddingInline * 2
    const lyricStageWidth = Math.max(
      LAYOUT_STAGE_MIN_WIDTH,
      row.lyrics.length * 11 + 80,
    )

    return {
      row,
      addButtonLeft,
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

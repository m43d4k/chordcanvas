import { useEffect, useReducer, useRef, useState } from 'react'
import type {
  CSSProperties,
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import ChordModal from './components/ChordModal'
import LayoutStage from './components/LayoutStage'
import StockPanel from './components/StockPanel'
import {
  exportLayoutStageLongPdf,
  exportLayoutStagePdf,
} from './export/layoutPdf'
import { useDelayedToggle } from './hooks/useDelayedToggle'
import { useDelayedValue } from './hooks/useDelayedValue'
import { useLayoutOverlayAnchors } from './hooks/useLayoutOverlayAnchors'
import {
  LAYOUT_BLOCK_WIDTH,
  LAYOUT_ROW_PADDING_INLINE,
  LAYOUT_STAGE_PADDING_INLINE,
  buildLayoutEntries,
  calculateDraggedBlockLayout,
} from './layout/layoutEntries'
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
import { projectReducer } from './state/projectReducer'
import { UI_TEXT, type Locale } from './uiText'

const DEFAULT_ROOT: PitchClassName = 'E'
const DEFAULT_QUALITY: ChordQuality = 'major'
const DEFAULT_SPACING = 6
const LAYOUT_HOVER_HINT_DELAY_MS = 350
const MIN_MANUAL_FRET_COUNT = MINIMUM_DIAGRAM_FRET_COUNT
const MAX_MANUAL_FRET_COUNT = 12
const PROJECT_EXPORT_FILE_NAME = 'chordcanvas-project.json'

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

type PdfExportKind = 'a4' | 'long'

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

function createInitialProjectState(
  initialState: ReturnType<typeof createInitialAppState>,
): ProjectSnapshot {
  return {
    selectedRoot: DEFAULT_ROOT,
    selectedQuality: DEFAULT_QUALITY,
    selectedFormId: initialState.initialFormId,
    currentFretting: copyFretting(initialState.initialBlock.fretting),
    currentChordName: '',
    layoutRows: [initialState.initialRow],
    stockChords: [],
    blocks: [initialState.initialBlock],
    selectedBlockId: initialState.initialBlock.id,
    selectedLayoutRowId: initialState.initialRow.id,
    manualStartFret: initialState.initialManualViewport.startFret,
    manualFretCount: initialState.initialManualViewport.fretCount,
  }
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
  const layoutStageFrameRef = useRef<HTMLDivElement | null>(null)
  const layoutStageWrapperRef = useRef<HTMLDivElement | null>(null)
  const layoutStageRef = useRef<HTMLDivElement | null>(null)
  const layoutToolbarRef = useRef<HTMLDivElement | null>(null)
  const layoutAddButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  )
  const layoutRowAddButtonRef = useRef<HTMLButtonElement | null>(null)
  const lyricsInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)
  const [locale, setLocale] = useState<Locale>('ja')
  const [projectState, dispatchProjectAction] = useReducer(
    projectReducer,
    initialState,
    createInitialProjectState,
  )
  const [appError, setAppError] = useState<string | null>(null)
  const [pdfExportKind, setPdfExportKind] = useState<PdfExportKind | null>(null)
  const [editingLyricsRowId, setEditingLyricsRowId] = useState<string | null>(
    null,
  )
  const [chordModal, setChordModal] = useState<ChordModalState | null>(null)
  const layoutBlockDragStateRef = useRef<LayoutBlockDragState | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [visibleBlockToolbarId, setVisibleBlockToolbarId] = useState<
    string | null
  >(null)
  const stockAddHint = useDelayedToggle(LAYOUT_HOVER_HINT_DELAY_MS)
  const layoutHoverHint = useDelayedValue<string>(LAYOUT_HOVER_HINT_DELAY_MS)
  const layoutAddHint = useDelayedValue<string>(LAYOUT_HOVER_HINT_DELAY_MS)
  const layoutRowAddHint = useDelayedToggle(LAYOUT_HOVER_HINT_DELAY_MS)
  const text = UI_TEXT[locale]
  const isExportingPdf = pdfExportKind !== null
  const {
    blocks,
    currentChordName,
    currentFretting,
    layoutRows,
    manualFretCount,
    manualStartFret,
    selectedBlockId,
    selectedFormId,
    selectedLayoutRowId,
    selectedQuality,
    selectedRoot,
    stockChords,
  } = projectState

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
  const modalManualGridTemplate = `repeat(${modalVisibleFrets.length + 3}, var(--manual-grid-unit))`
  const modalManualStringEntries = modalDraft
    ? modalDraft.fretting
        .map((state, stringIndex) => ({
          state,
          stringIndex,
          stringNumber: 6 - stringIndex,
        }))
        .reverse()
    : []
  const isModalDraftStocked = modalDraft
    ? stockChords.some((stockChord) =>
        isSameFretting(stockChord.fretting, modalDraft.fretting),
      )
    : false
  const isModalChordStocked =
    chordModal?.kind === 'stock' && isModalDraftStocked
  const showStockAddHint = stockAddHint.visible
  const hoveredBlockId = layoutHoverHint.value
  const hoveredLayoutAddRowId = layoutAddHint.value
  const shouldShowLayoutRowAddHint =
    !isExportingPdf && !draggingBlockId && layoutRowAddHint.visible
  const {
    layoutAddHintAnchor,
    layoutHintAnchor,
    layoutRowAddHintAnchor,
    layoutToolbarAnchor,
  } = useLayoutOverlayAnchors({
    addButtonRefs: layoutAddButtonRefs,
    blocks,
    frameRef: layoutStageFrameRef,
    hoveredBlockId,
    hoveredLayoutAddRowId,
    layoutRows,
    rowAddButtonRef: layoutRowAddButtonRef,
    selectedBlockId,
    shouldShowLayoutRowAddHint,
    stageRef: layoutStageRef,
    visibleBlockToolbarId,
    wrapperRef: layoutStageWrapperRef,
  })
  const showLayoutHoverHint =
    !isExportingPdf &&
    !visibleBlockToolbarId &&
    !draggingBlockId &&
    !!hoveredBlockId &&
    !!layoutHintAnchor
  const showLayoutAddHint =
    !isExportingPdf &&
    !draggingBlockId &&
    !!hoveredLayoutAddRowId &&
    !!layoutAddHintAnchor

  function hideLayoutHoverHint(blockId?: string) {
    layoutHoverHint.hide(blockId)
  }

  function showLayoutHoverHintImmediately(blockId: string) {
    layoutHoverHint.showImmediately(blockId)
  }

  function scheduleLayoutHoverHint(blockId: string) {
    layoutHoverHint.scheduleShow(blockId)
  }

  function hideStockAddHint() {
    stockAddHint.hide()
  }

  function showStockAddHintImmediately() {
    stockAddHint.showImmediately()
  }

  function scheduleStockAddHint() {
    stockAddHint.scheduleShow()
  }

  function hideLayoutRowAddHint() {
    layoutRowAddHint.hide()
  }

  function showLayoutRowAddHintImmediately() {
    layoutRowAddHint.showImmediately()
  }

  function scheduleLayoutRowAddHint() {
    layoutRowAddHint.scheduleShow()
  }

  function hideLayoutAddHint(rowId?: string) {
    layoutAddHint.hide(rowId)
  }

  function showLayoutAddHintImmediately(rowId: string) {
    layoutAddHint.showImmediately(rowId)
  }

  function scheduleLayoutAddHint(rowId: string) {
    layoutAddHint.scheduleShow(rowId)
  }

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

      const { nextSpacing, nextXOffset } = calculateDraggedBlockLayout({
        clientX: event.clientX,
        hasFollowingBlock: dragState.hasFollowingBlock,
        minXOffset: dragState.minXOffset,
        startClientX: dragState.startClientX,
        startSpacing: dragState.startSpacing,
        startXOffset: dragState.startXOffset,
      })

      dispatchProjectAction({
        type: 'updateBlock',
        blockId: dragState.blockId,
        changes: {
          spacing: nextSpacing,
          xOffset: nextXOffset,
        },
      })
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
    if (!visibleBlockToolbarId) {
      return
    }

    if (!blocks.some((block) => block.id === visibleBlockToolbarId)) {
      setVisibleBlockToolbarId(null)
    }
  }, [blocks, visibleBlockToolbarId])

  useEffect(() => {
    if (!visibleBlockToolbarId) {
      return
    }

    function handleWindowPointerDown(event: PointerEvent) {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      const activeBlock = layoutStageRef.current?.querySelector<HTMLElement>(
        `[data-layout-block-id="${visibleBlockToolbarId}"]`,
      )

      if (
        activeBlock?.contains(target) ||
        layoutToolbarRef.current?.contains(target)
      ) {
        return
      }

      setVisibleBlockToolbarId(null)
    }

    window.addEventListener('pointerdown', handleWindowPointerDown)

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown)
    }
  }, [visibleBlockToolbarId])

  useEffect(() => {
    if (!hoveredBlockId) {
      return
    }

    if (!blocks.some((block) => block.id === hoveredBlockId)) {
      layoutHoverHint.setValue(null)
    }
  }, [blocks, hoveredBlockId, layoutHoverHint])

  useEffect(() => {
    if (!hoveredLayoutAddRowId) {
      return
    }

    if (!layoutRows.some((row) => row.id === hoveredLayoutAddRowId)) {
      layoutAddHint.setValue(null)
    }
  }, [hoveredLayoutAddRowId, layoutRows, layoutAddHint])

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
    hideLayoutHoverHint()
    hideLayoutAddHint()
    hideLayoutRowAddHint()
    hideStockAddHint()
    setVisibleBlockToolbarId(null)
    setChordModal(null)
    dispatchProjectAction({
      type: 'applySnapshot',
      snapshot: nextSnapshot,
    })
  }

  function activateBlock(
    block: ChordBlockState,
    { revealToolbar = false }: { revealToolbar?: boolean } = {},
  ) {
    dispatchProjectAction({
      type: 'activateBlock',
      blockId: block.id,
    })
    setEditingLyricsRowId(null)
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(revealToolbar ? block.id : null)
  }

  function selectLayoutRow(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    dispatchProjectAction({
      type: 'selectLayoutRow',
      rowId,
    })
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
  }

  function startLyricsLineEditing(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    dispatchProjectAction({
      type: 'selectLayoutRow',
      rowId,
    })
    setEditingLyricsRowId(rowId)
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
  }

  function commitChordDraft(draft: ChordDraftState) {
    dispatchProjectAction({
      type: 'commitDraft',
      draft,
    })
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
    hideStockAddHint()
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
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

    dispatchProjectAction({
      type: 'selectLayoutRow',
      rowId,
    })
    setEditingLyricsRowId(null)
    hideLayoutAddHint()
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
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

    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
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

      return syncDraftViewport(
        {
          ...draft,
          selectedFormId: nextForm?.id ?? '',
          selectedRoot: nextRoot,
        },
        nextFretting,
      )
    })
  }

  function handleChordModalQualityChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const nextQuality = event.target.value as ChordQuality

    updateChordModalDraft((draft) => {
      const nextForms = getChordForms(draft.selectedRoot, nextQuality)
      const nextForm = nextForms[0]
      const nextFretting = nextForm
        ? copyFretting(nextForm.fretting)
        : draft.fretting

      return syncDraftViewport(
        {
          ...draft,
          selectedFormId: nextForm?.id ?? '',
          selectedQuality: nextQuality,
        },
        nextFretting,
      )
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

    dispatchProjectAction({
      type: 'addBlock',
      block: nextBlock,
    })
    activateBlock(nextBlock)
  }

  function addChordDraftToStock(draft: ChordDraftState): boolean {
    if (
      stockChords.some((stockChord) =>
        isSameFretting(stockChord.fretting, draft.fretting),
      )
    ) {
      return false
    }

    commitChordDraft(draft)
    dispatchProjectAction({
      type: 'addStockChord',
      stockChord: createStockChord(
        copyFretting(draft.fretting),
        toStoredDisplayName(draft.chordName),
      ),
    })
    setAppError(null)
    return true
  }

  function closeChordModal() {
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    setChordModal(null)
  }

  function handleSubmitChordModal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!chordModal) {
      return
    }

    const { draft } = chordModal

    if (chordModal.kind === 'stock') {
      if (!addChordDraftToStock(draft)) {
        return
      }

      closeChordModal()
      return
    }

    if (chordModal.kind === 'layout') {
      commitChordDraft(draft)
      setAppError(null)
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
    dispatchProjectAction({
      type: 'updateBlock',
      blockId: chordModal.blockId,
      changes: {
        displayName: toStoredDisplayName(draft.chordName),
        fretting: copyFretting(draft.fretting),
      },
    })
    setAppError(null)
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
    setAppError(null)
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

  function handleAddChordModalDraftToStock() {
    if (!chordModal || chordModal.kind !== 'layout') {
      return
    }

    addChordDraftToStock(chordModal.draft)
  }

  function handleRemoveStockChord(stockChordId: string) {
    const stockChord = stockChords.find((entry) => entry.id === stockChordId)

    if (!stockChord) {
      return
    }

    dispatchProjectAction({
      type: 'removeStockChord',
      stockChordId,
    })
    setAppError(null)
  }

  function handleDuplicateBlock() {
    const nextSelectedBlock = blocks.find((block) => block.id === selectedBlockId)

    if (!nextSelectedBlock) {
      return
    }

    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    const nextBlock = createChordBlock(
      copyFretting(nextSelectedBlock.fretting),
      activeLayoutRowId,
      {
        displayName: nextSelectedBlock.displayName,
        spacing: nextSelectedBlock.spacing,
        xOffset: nextSelectedBlock.xOffset,
      },
    )

    dispatchProjectAction({
      type: 'duplicateSelectedBlock',
      block: nextBlock,
    })
    activateBlock(nextBlock)
  }

  function handleDeleteBlock(blockId = selectedBlockId) {
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    dispatchProjectAction({
      type: 'deleteBlock',
      blockId,
    })
  }

  function handleMoveBlock(direction: -1 | 1) {
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    dispatchProjectAction({
      type: 'moveSelectedBlock',
      direction,
    })
  }

  function handleAddLayoutRow() {
    const nextRow = createLayoutRow()
    hideLayoutAddHint()
    hideLayoutHoverHint()
    hideLayoutRowAddHint()
    setVisibleBlockToolbarId(null)
    dispatchProjectAction({
      type: 'addLayoutRow',
      row: nextRow,
    })
  }

  function handleDeleteLayoutRow(rowId: string) {
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    dispatchProjectAction({
      type: 'deleteLayoutRow',
      rowId,
    })
    if (editingLyricsRowId === rowId) {
      setEditingLyricsRowId(null)
    }
  }

  function handleLyricsLineChange(
    rowId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextLyrics = event.target.value

    dispatchProjectAction({
      type: 'updateLyrics',
      lyrics: nextLyrics,
      rowId,
    })
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
    hideLayoutHoverHint()
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
    setAppError(null)
  }

  async function handlePdfExport(kind: PdfExportKind) {
    const layoutStageElement = layoutStageRef.current

    if (!layoutStageElement) {
      setAppError(text.pdfExportFailedMissingStage)
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
    setPdfExportKind(kind)

    try {
      if (kind === 'a4') {
        await exportLayoutStagePdf(layoutStageElement)
      } else {
        await exportLayoutStageLongPdf(layoutStageElement)
      }

      setAppError(null)
    } catch (error) {
      setAppError(
        text.pdfExportFailed(
          error instanceof Error ? error.message : text.unknownError,
        ),
      )
    } finally {
      setPdfExportKind(null)
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
      setAppError(null)
    } catch (error) {
      setAppError(
        text.importFailed(
          error instanceof Error ? error.message : text.unknownError,
        ),
      )
    } finally {
      input.value = ''
    }
  }

  const modalTitle = chordModal
    ? chordModal.kind === 'stock'
      ? text.chordBuilderModalTitle
      : chordModal.kind === 'layout'
        ? text.layoutAddModalTitle
        : text.layoutEditModalTitle
    : ''
  const modalSubmitLabel = chordModal
    ? chordModal.kind === 'stock'
      ? isModalChordStocked
        ? text.alreadyStockedButton
        : text.addToStock
      : chordModal.kind === 'layout'
        ? text.addToRow
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
              onClick={() => handlePdfExport('a4')}
              type="button"
            >
              {pdfExportKind === 'a4' ? text.exportingPdf : text.exportPdfA4}
            </button>
            <button
              className="secondary-button"
              disabled={isExportingPdf}
              onClick={() => handlePdfExport('long')}
              type="button"
            >
              {pdfExportKind === 'long'
                ? text.exportingPdf
                : text.exportPdfLong}
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

          {appError ? (
            <p className="project-feedback error" role="alert">
              {appError}
            </p>
          ) : null}
        </div>
      </header>

      <StockPanel
        onOpenStockModal={openStockChordModal}
        onRemoveStockChord={handleRemoveStockChord}
        onStockAddHintHide={hideStockAddHint}
        onStockAddHintSchedule={scheduleStockAddHint}
        onStockAddHintShowImmediately={showStockAddHintImmediately}
        showStockAddHint={showStockAddHint}
        stockEntries={stockEntries}
        text={text}
      />

      <LayoutStage
        activeRowBlockIds={activeRowBlockIds}
        activeRowSelectionIndex={activeRowSelectionIndex}
        blocksLength={blocks.length}
        draggingBlockId={draggingBlockId}
        editingLyricsRowId={editingLyricsRowId}
        isExportingPdf={isExportingPdf}
        layoutAddButtonRefs={layoutAddButtonRefs}
        layoutAddHintAnchor={layoutAddHintAnchor}
        layoutEntries={layoutEntries}
        layoutHintAnchor={layoutHintAnchor}
        layoutRowAddButtonRef={layoutRowAddButtonRef}
        layoutRowAddHintAnchor={layoutRowAddHintAnchor}
        layoutRowsLength={layoutRows.length}
        layoutStageFrameRef={layoutStageFrameRef}
        layoutStageRef={layoutStageRef}
        layoutStageStyle={layoutStageStyle}
        layoutStageWrapperRef={layoutStageWrapperRef}
        layoutToolbarAnchor={layoutToolbarAnchor}
        layoutToolbarRef={layoutToolbarRef}
        lyricsInputRefs={lyricsInputRefs}
        onActivateBlock={activateBlock}
        onAddLayoutRow={handleAddLayoutRow}
        onDeleteBlock={handleDeleteBlock}
        onDeleteLayoutRow={handleDeleteLayoutRow}
        onDuplicateBlock={handleDuplicateBlock}
        onEditSelectedChord={openEditChordModal}
        onHideLayoutAddHint={hideLayoutAddHint}
        onHideLayoutHoverHint={hideLayoutHoverHint}
        onHideLayoutRowAddHint={hideLayoutRowAddHint}
        onLayoutBlockPointerDown={handleLayoutBlockPointerDown}
        onLayoutRowInputChange={handleLyricsLineChange}
        onLyricsBlur={() => setEditingLyricsRowId(null)}
        onMoveBlock={handleMoveBlock}
        onOpenLayoutChordModal={openLayoutChordModal}
        onScheduleLayoutAddHint={scheduleLayoutAddHint}
        onScheduleLayoutHoverHint={scheduleLayoutHoverHint}
        onScheduleLayoutRowAddHint={scheduleLayoutRowAddHint}
        onSelectLayoutRow={selectLayoutRow}
        onShowLayoutAddHintImmediately={showLayoutAddHintImmediately}
        onShowLayoutHoverHintImmediately={showLayoutHoverHintImmediately}
        onShowLayoutRowAddHintImmediately={showLayoutRowAddHintImmediately}
        onStartLyricsLineEditing={startLyricsLineEditing}
        selectedBlockId={selectedBlockId}
        selectedLayoutRowId={selectedLayoutRowId}
        shouldShowLayoutRowAddHint={shouldShowLayoutRowAddHint}
        showLayoutAddHint={showLayoutAddHint}
        showLayoutHoverHint={showLayoutHoverHint}
        text={text}
        visibleBlockToolbarId={visibleBlockToolbarId}
      />

      {chordModal && modalDraft && modalSummary ? (
        <ChordModal
          availableForms={modalAvailableForms}
          chordModalKind={chordModal.kind}
          displayName={modalDisplayName}
          isModalChordStocked={isModalChordStocked}
          isModalDraftStocked={isModalDraftStocked}
          manualFretCount={modalDraft.manualFretCount}
          manualGridTemplate={modalManualGridTemplate}
          manualStartFret={modalDraft.manualStartFret}
          manualStringEntries={modalManualStringEntries}
          manualVisibleFrets={modalVisibleFrets}
          maxManualFretCount={MAX_MANUAL_FRET_COUNT}
          minManualFretCount={MIN_MANUAL_FRET_COUNT}
          onAddChordDraftToStock={handleAddChordModalDraftToStock}
          onAddStockChordFromModal={handleAddStockChordFromModal}
          onChordNameChange={handleChordModalNameChange}
          onClose={closeChordModal}
          onFormChange={handleChordModalFormChange}
          onManualFretCountChange={handleChordModalManualFretCountChange}
          onManualStartFretChange={handleChordModalManualStartFretChange}
          onQualityChange={handleChordModalQualityChange}
          onRootChange={handleChordModalRootChange}
          onStringStateChange={handleChordModalStringStateChange}
          onSubmit={handleSubmitChordModal}
          onViewportSync={handleChordModalViewportSync}
          selectedBlockDisplayName={selectedBlockDisplayName}
          selectedFormId={modalDraft.selectedFormId}
          selectedQuality={modalDraft.selectedQuality}
          selectedRoot={modalDraft.selectedRoot}
          stockEntries={stockEntries}
          submitLabel={modalSubmitLabel}
          summary={modalSummary}
          text={text}
          title={modalTitle}
          valueChordName={modalDraft.chordName}
          valueFretting={modalDraft.fretting}
          visible
        />
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

export default App

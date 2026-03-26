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
  PdfExportError,
  exportLayoutStageLongPdf,
  exportLayoutStagePdf,
} from './export/layoutPdf'
import {
  createVisibleFrets,
  copyFretting,
  type ChordDraftState,
  type CurrentChordDraftSource,
} from './features/chordModal/draft'
import { useDelayedToggle } from './hooks/useDelayedToggle'
import { useDelayedValue } from './hooks/useDelayedValue'
import { useChordModalController } from './hooks/useChordModalController'
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
  getChordForms,
  summarizeChord,
  toFretting,
} from './music/chords'
import { playChordFretting } from './audio/webAudioFont'
import {
  cloneProjectSnapshot,
  parseProjectFile,
  serializeProjectFile,
  type ChordBlockState,
  ProjectFileError,
  type ProjectSnapshot,
} from './project/projectFile'
import { createProjectState, projectReducer } from './state/projectReducer'
import { UI_TEXT, type Locale, type UiText } from './uiText'

const DEFAULT_ROOT: PitchClassName = 'E'
const DEFAULT_QUALITY: ChordQuality = 'major'
const DEFAULT_SPACING = 6
const INITIAL_BLOCK_ID = 'chord-1'
const INITIAL_ROW_ID = 'row-1'
const LAYOUT_HOVER_HINT_DELAY_MS = 350
const MIN_MANUAL_FRET_COUNT = MINIMUM_DIAGRAM_FRET_COUNT
const MAX_MANUAL_FRET_COUNT = 12
const PROJECT_EXPORT_FILE_NAME = 'chordcanvas-project.json'
const APP_LOGO_SRC = `${import.meta.env.BASE_URL}chordcanvas-logo.svg`
const LOCALE_STORAGE_KEY = 'chordcanvas-locale'

function getProjectImportErrorMessage(error: unknown, text: UiText): string {
  if (error instanceof ProjectFileError) {
    return text.describeProjectImportError(
      error.code,
      error.fieldName,
      error.id,
    )
  }

  return error instanceof Error ? error.message : text.unknownError
}

function getPdfExportErrorMessage(error: unknown, text: UiText): string {
  if (error instanceof PdfExportError) {
    return text.describePdfExportError(error.code)
  }

  return error instanceof Error ? error.message : text.unknownError
}

function getAudioPlaybackErrorMessage(error: unknown, text: UiText): string {
  return error instanceof Error ? error.message : text.unknownError
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

type PdfExportKind = 'a4' | 'long'

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

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'ja'
  }

  const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)

  return savedLocale === 'ja' || savedLocale === 'en' ? savedLocale : 'ja'
}

function createInitialProjectState(): ProjectSnapshot {
  const initialForms = getChordForms(DEFAULT_ROOT, DEFAULT_QUALITY)
  const initialForm = initialForms[0]
  const initialRow = {
    id: INITIAL_ROW_ID,
    lyrics: '',
  }
  const initialBlock: ChordBlockState = {
    id: INITIAL_BLOCK_ID,
    fretting:
      initialForm?.fretting ?? toFretting(['x', 'x', 'x', 'x', 'x', 'x']),
    displayName: undefined,
    rowId: initialRow.id,
    spacing: DEFAULT_SPACING,
    xOffset: 0,
  }
  const initialManualViewport = summarizeChord(initialBlock.fretting).viewport

  return {
    selectedRoot: DEFAULT_ROOT,
    selectedQuality: DEFAULT_QUALITY,
    selectedFormId: initialForm?.id ?? '',
    currentFretting: copyFretting(initialBlock.fretting),
    currentChordName: '',
    layoutRows: [initialRow],
    stockChords: [],
    blocks: [initialBlock],
    selectedBlockId: initialBlock.id,
    selectedLayoutRowId: initialRow.id,
    manualStartFret: initialManualViewport.startFret,
    manualFretCount: initialManualViewport.fretCount,
  }
}

function App() {
  const [initialProjectSnapshot] = useState(createInitialProjectState)
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
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const [projectState, dispatchProjectAction] = useReducer(
    projectReducer,
    initialProjectSnapshot,
    createProjectState,
  )
  const [appError, setAppError] = useState<string | null>(null)
  const [pdfExportKind, setPdfExportKind] = useState<PdfExportKind | null>(null)
  const [editingLyricsRowId, setEditingLyricsRowId] = useState<string | null>(
    null,
  )
  const layoutBlockDragStateRef = useRef<LayoutBlockDragState | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [highlightedLayoutBlockId, setHighlightedLayoutBlockId] = useState<
    string | null
  >(initialProjectSnapshot.selectedBlockId)
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
  const currentDraftSource: CurrentChordDraftSource = {
    currentChordName,
    currentFretting,
    manualFretCount,
    manualStartFret,
    selectedFormId,
    selectedQuality,
    selectedRoot,
  }
  const {
    chordModal,
    closeChordModal: dismissChordModal,
    handleAddChordModalDraftToStock,
    handleAddStockChordFromModal,
    handleChordModalFormChange,
    handleChordModalManualFretCountChange,
    handleChordModalManualStartFretChange,
    handleChordModalNameChange,
    handleChordModalQualityChange,
    handleChordModalRootChange,
    handleChordModalStringStateChange,
    handleChordModalViewportSync,
    handleSubmitChordModal,
    isModalDraftStocked,
    modalDraft,
    openEditChordModal: startEditChordModal,
    openLayoutChordModal: startLayoutChordModal,
    openStockChordModal: startStockChordModal,
  } = useChordModalController({
    blocks,
    currentDraftSource,
    layoutRows,
    onAddLayoutBlockFromDraft: addLayoutBlockFromDraft,
    onAddStockChordFromDraft: addChordDraftToStock,
    onAddStockChordToLayout: handleAddStockChordToLayout,
    onSelectLayoutRow: selectLayoutRow,
    onUpdateBlockFromDraft: updateBlockFromDraft,
    stockChords,
  })
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
    setHighlightedLayoutBlockId(selectedBlockId)
  }, [selectedBlockId])

  useEffect(() => {
    if (!visibleBlockToolbarId) {
      return
    }

    if (!blocks.some((block) => block.id === visibleBlockToolbarId)) {
      setVisibleBlockToolbarId(null)
    }
  }, [blocks, visibleBlockToolbarId])

  useEffect(() => {
    const activeLayoutBlockId = visibleBlockToolbarId ?? highlightedLayoutBlockId

    if (!activeLayoutBlockId) {
      return
    }

    function handleWindowPointerDown(event: PointerEvent) {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      const activeBlock = layoutStageRef.current?.querySelector<HTMLElement>(
        `[data-layout-block-id="${activeLayoutBlockId}"]`,
      )

      if (
        activeBlock?.contains(target) ||
        layoutToolbarRef.current?.contains(target)
      ) {
        return
      }

      setVisibleBlockToolbarId(null)
      setHighlightedLayoutBlockId(null)
    }

    window.addEventListener('pointerdown', handleWindowPointerDown)

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown)
    }
  }, [highlightedLayoutBlockId, visibleBlockToolbarId])

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
        dismissChordModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [chordModal, dismissChordModal])

  function createProjectSnapshot(): ProjectSnapshot {
    return cloneProjectSnapshot({
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
    })
  }

  function applyProjectSnapshot(snapshot: ProjectSnapshot) {
    const nextSnapshot = cloneProjectSnapshot(snapshot)

    setEditingLyricsRowId(null)
    hideLayoutHoverHint()
    hideLayoutAddHint()
    hideLayoutRowAddHint()
    hideStockAddHint()
    setHighlightedLayoutBlockId(nextSnapshot.selectedBlockId)
    setVisibleBlockToolbarId(null)
    dismissChordModal()
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
    setHighlightedLayoutBlockId(block.id)
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
    setHighlightedLayoutBlockId(null)
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
    setHighlightedLayoutBlockId(null)
    setVisibleBlockToolbarId(null)
  }

  function commitChordDraft(draft: ChordDraftState) {
    dispatchProjectAction({
      type: 'commitDraft',
      draft,
    })
  }

  function addBlockToLayoutRow(
    rowId: string,
    fretting: Fretting,
    displayName?: string,
  ) {
    dispatchProjectAction({
      type: 'addBlock',
      displayName: toStoredDisplayName(displayName),
      fretting: copyFretting(fretting),
      rowId,
    })
  }

  function addLayoutBlockFromDraft(rowId: string, draft: ChordDraftState) {
    commitChordDraft(draft)
    addBlockToLayoutRow(rowId, draft.fretting, draft.chordName)
    setAppError(null)
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
      displayName: toStoredDisplayName(draft.chordName),
      fretting: copyFretting(draft.fretting),
    })
    setAppError(null)
    return true
  }

  function updateBlockFromDraft(blockId: string, draft: ChordDraftState) {
    commitChordDraft(draft)
    dispatchProjectAction({
      type: 'updateBlock',
      blockId,
      changes: {
        displayName: toStoredDisplayName(draft.chordName),
        fretting: copyFretting(draft.fretting),
      },
    })
    setAppError(null)
  }

  function openStockChordModal() {
    hideStockAddHint()
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    startStockChordModal()
  }

  function openLayoutChordModal(rowId: string) {
    setEditingLyricsRowId(null)
    hideLayoutAddHint()
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    startLayoutChordModal(rowId)
  }

  function openEditChordModal() {
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    startEditChordModal(selectedBlockId)
  }

  function closeChordModal() {
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    dismissChordModal()
  }

  function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === locale) {
      return
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
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
    setAppError(null)
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
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
    dispatchProjectAction({
      type: 'duplicateSelectedBlock',
    })
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
    hideLayoutAddHint()
    hideLayoutHoverHint()
    hideLayoutRowAddHint()
    setHighlightedLayoutBlockId(null)
    setVisibleBlockToolbarId(null)
    dispatchProjectAction({
      type: 'addLayoutRow',
    })
  }

  function handleDeleteLayoutRow(rowId: string) {
    hideLayoutHoverHint()
    setHighlightedLayoutBlockId(null)
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

  async function handlePlayChord(fretting: Fretting) {
    try {
      setAppError(null)
      await playChordFretting(fretting)
    } catch (error) {
      setAppError(getAudioPlaybackErrorMessage(error, text))
    }
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
      setAppError(text.pdfExportFailed(getPdfExportErrorMessage(error, text)))
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
      setAppError(text.importFailed(getProjectImportErrorMessage(error, text)))
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
          <h1 className="hero-brand">
            <img
              aria-hidden="true"
              className="app-logo"
              height="24"
              src={APP_LOGO_SRC}
              width="170"
            />
            <span className="visually-hidden">ChordCanvas</span>
          </h1>
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
              aria-label={text.projectFileInputAriaLabel}
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
        onAddStockChordToLayout={handleAddStockChordToLayout}
        onOpenStockModal={openStockChordModal}
        onPlayStockChord={(stockChordId) => {
          const stockChord = stockChords.find((entry) => entry.id === stockChordId)

          if (stockChord) {
            void handlePlayChord(stockChord.fretting)
          }
        }}
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
        highlightedBlockId={highlightedLayoutBlockId}
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
        onPlayLayoutChord={(block) => {
          void handlePlayChord(block.fretting)
        }}
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
          onPlayChord={() => {
            void handlePlayChord(modalDraft.fretting)
          }}
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
        />
      ) : null}
    </main>
  )
}

export default App

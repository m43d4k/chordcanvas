import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import ChordComposer from './components/ChordComposer'
import ChordDiagram from './components/ChordDiagram'
import {
  exportLayoutStageLongPdf,
  exportLayoutStagePdf,
} from './export/layoutPdf'
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

interface LayoutOverlayAnchor {
  height: number
  left: number
  top: number
  width: number
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
  const [appError, setAppError] = useState<string | null>(null)
  const [pdfExportKind, setPdfExportKind] = useState<PdfExportKind | null>(null)
  const [editingLyricsRowId, setEditingLyricsRowId] = useState<string | null>(
    null,
  )
  const [chordModal, setChordModal] = useState<ChordModalState | null>(null)
  const layoutBlockDragStateRef = useRef<LayoutBlockDragState | null>(null)
  const stockAddHintTimeoutRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null)
  const layoutHoverHintTimeoutRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null)
  const layoutAddHintTimeoutRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null)
  const layoutRowAddHintTimeoutRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [visibleBlockToolbarId, setVisibleBlockToolbarId] = useState<
    string | null
  >(null)
  const [showStockAddHint, setShowStockAddHint] = useState(false)
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null)
  const [hoveredLayoutAddRowId, setHoveredLayoutAddRowId] = useState<
    string | null
  >(null)
  const [showLayoutRowAddHint, setShowLayoutRowAddHint] = useState(false)
  const [layoutToolbarAnchor, setLayoutToolbarAnchor] =
    useState<LayoutOverlayAnchor | null>(null)
  const [layoutHintAnchor, setLayoutHintAnchor] =
    useState<LayoutOverlayAnchor | null>(null)
  const [layoutAddHintAnchor, setLayoutAddHintAnchor] =
    useState<LayoutOverlayAnchor | null>(null)
  const [layoutRowAddHintAnchor, setLayoutRowAddHintAnchor] =
    useState<LayoutOverlayAnchor | null>(null)
  const text = UI_TEXT[locale]
  const isExportingPdf = pdfExportKind !== null

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
  const selectedBlockRowId = selectedBlock.rowId
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
  const hasStockEntries = stockEntries.length > 0
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
  const shouldShowLayoutRowAddHint =
    !isExportingPdf && !draggingBlockId && showLayoutRowAddHint

  function clearLayoutHoverHintTimeout() {
    const timeoutId = layoutHoverHintTimeoutRef.current

    if (timeoutId === null) {
      return
    }

    window.clearTimeout(timeoutId)
    layoutHoverHintTimeoutRef.current = null
  }

  function hideLayoutHoverHint(blockId?: string) {
    clearLayoutHoverHintTimeout()
    setHoveredBlockId((currentId) =>
      blockId && currentId !== blockId ? currentId : null,
    )
  }

  function showLayoutHoverHintImmediately(blockId: string) {
    clearLayoutHoverHintTimeout()
    setHoveredBlockId(blockId)
  }

  function scheduleLayoutHoverHint(blockId: string) {
    clearLayoutHoverHintTimeout()
    setHoveredBlockId((currentId) => (currentId === blockId ? currentId : null))
    layoutHoverHintTimeoutRef.current = window.setTimeout(() => {
      setHoveredBlockId(blockId)
      layoutHoverHintTimeoutRef.current = null
    }, LAYOUT_HOVER_HINT_DELAY_MS)
  }

  function clearStockAddHintTimeout() {
    const timeoutId = stockAddHintTimeoutRef.current

    if (timeoutId === null) {
      return
    }

    window.clearTimeout(timeoutId)
    stockAddHintTimeoutRef.current = null
  }

  function hideStockAddHint() {
    clearStockAddHintTimeout()
    setShowStockAddHint(false)
  }

  function showStockAddHintImmediately() {
    clearStockAddHintTimeout()
    setShowStockAddHint(true)
  }

  function scheduleStockAddHint() {
    clearStockAddHintTimeout()
    setShowStockAddHint(false)
    stockAddHintTimeoutRef.current = window.setTimeout(() => {
      setShowStockAddHint(true)
      stockAddHintTimeoutRef.current = null
    }, LAYOUT_HOVER_HINT_DELAY_MS)
  }

  function clearLayoutRowAddHintTimeout() {
    const timeoutId = layoutRowAddHintTimeoutRef.current

    if (timeoutId === null) {
      return
    }

    window.clearTimeout(timeoutId)
    layoutRowAddHintTimeoutRef.current = null
  }

  function hideLayoutRowAddHint() {
    clearLayoutRowAddHintTimeout()
    setShowLayoutRowAddHint(false)
  }

  function showLayoutRowAddHintImmediately() {
    clearLayoutRowAddHintTimeout()
    setShowLayoutRowAddHint(true)
  }

  function scheduleLayoutRowAddHint() {
    clearLayoutRowAddHintTimeout()
    setShowLayoutRowAddHint(false)
    layoutRowAddHintTimeoutRef.current = window.setTimeout(() => {
      setShowLayoutRowAddHint(true)
      layoutRowAddHintTimeoutRef.current = null
    }, LAYOUT_HOVER_HINT_DELAY_MS)
  }

  function clearLayoutAddHintTimeout() {
    const timeoutId = layoutAddHintTimeoutRef.current

    if (timeoutId === null) {
      return
    }

    window.clearTimeout(timeoutId)
    layoutAddHintTimeoutRef.current = null
  }

  function hideLayoutAddHint(rowId?: string) {
    clearLayoutAddHintTimeout()
    setHoveredLayoutAddRowId((currentId) =>
      rowId && currentId !== rowId ? currentId : null,
    )
  }

  function showLayoutAddHintImmediately(rowId: string) {
    clearLayoutAddHintTimeout()
    setHoveredLayoutAddRowId(rowId)
  }

  function scheduleLayoutAddHint(rowId: string) {
    clearLayoutAddHintTimeout()
    setHoveredLayoutAddRowId((currentId) => (currentId === rowId ? currentId : null))
    layoutAddHintTimeoutRef.current = window.setTimeout(() => {
      setHoveredLayoutAddRowId(rowId)
      layoutAddHintTimeoutRef.current = null
    }, LAYOUT_HOVER_HINT_DELAY_MS)
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

  useEffect(
    () => () => {
      const stockAddHintTimeoutId = stockAddHintTimeoutRef.current

      if (stockAddHintTimeoutId !== null) {
        window.clearTimeout(stockAddHintTimeoutId)
        stockAddHintTimeoutRef.current = null
      }

      const layoutHoverHintTimeoutId = layoutHoverHintTimeoutRef.current

      if (layoutHoverHintTimeoutId !== null) {
        window.clearTimeout(layoutHoverHintTimeoutId)
        layoutHoverHintTimeoutRef.current = null
      }

      const layoutAddHintTimeoutId = layoutAddHintTimeoutRef.current

      if (layoutAddHintTimeoutId !== null) {
        window.clearTimeout(layoutAddHintTimeoutId)
        layoutAddHintTimeoutRef.current = null
      }

      const layoutRowAddHintTimeoutId = layoutRowAddHintTimeoutRef.current

      if (layoutRowAddHintTimeoutId !== null) {
        window.clearTimeout(layoutRowAddHintTimeoutId)
        layoutRowAddHintTimeoutRef.current = null
      }
    },
    [],
  )

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
      const appliedDeltaX =
        Math.max(dragState.minXOffset, dragState.startXOffset + deltaX) -
        dragState.startXOffset
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
      setHoveredBlockId(null)
    }
  }, [blocks, hoveredBlockId])

  useEffect(() => {
    if (!hoveredLayoutAddRowId) {
      return
    }

    if (!layoutRows.some((row) => row.id === hoveredLayoutAddRowId)) {
      setHoveredLayoutAddRowId(null)
    }
  }, [hoveredLayoutAddRowId, layoutRows])

  useLayoutEffect(() => {
    function getLayoutOverlayAnchorForElement(
      element: HTMLElement | null,
    ): LayoutOverlayAnchor | null {
      if (!element) {
        return null
      }

      const frameElement = layoutStageFrameRef.current

      if (!frameElement) {
        return null
      }

      const frameRect = frameElement.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()

      return {
        height: elementRect.height,
        left: elementRect.left - frameRect.left,
        top: elementRect.top - frameRect.top,
        width: elementRect.width,
      }
    }

    function getLayoutOverlayAnchor(
      blockId: string | null,
    ): LayoutOverlayAnchor | null {
      if (!blockId) {
        return null
      }

      return getLayoutOverlayAnchorForElement(
        layoutStageRef.current?.querySelector<HTMLElement>(
          `[data-layout-block-id="${blockId}"]`,
        ) ?? null,
      )
    }

    function updateLayoutOverlayAnchors() {
      setLayoutToolbarAnchor(getLayoutOverlayAnchor(visibleBlockToolbarId))
      setLayoutHintAnchor(getLayoutOverlayAnchor(hoveredBlockId))
      setLayoutAddHintAnchor(
        hoveredLayoutAddRowId
          ? getLayoutOverlayAnchorForElement(
              layoutAddButtonRefs.current[hoveredLayoutAddRowId] ?? null,
            )
          : null,
      )
      setLayoutRowAddHintAnchor(
        shouldShowLayoutRowAddHint
          ? getLayoutOverlayAnchorForElement(layoutRowAddButtonRef.current)
          : null,
      )
    }

    updateLayoutOverlayAnchors()

    if (
      !visibleBlockToolbarId &&
      !hoveredBlockId &&
      !hoveredLayoutAddRowId &&
      !shouldShowLayoutRowAddHint
    ) {
      return
    }

    const wrapperElement = layoutStageWrapperRef.current

    window.addEventListener('resize', updateLayoutOverlayAnchors)
    wrapperElement?.addEventListener('scroll', updateLayoutOverlayAnchors, {
      passive: true,
    })

    return () => {
      window.removeEventListener('resize', updateLayoutOverlayAnchors)
      wrapperElement?.removeEventListener('scroll', updateLayoutOverlayAnchors)
    }
  }, [
    blocks,
    draggingBlockId,
    hoveredBlockId,
    hoveredLayoutAddRowId,
    layoutRows,
    selectedBlockId,
    shouldShowLayoutRowAddHint,
    visibleBlockToolbarId,
  ])

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
    setVisibleBlockToolbarId(null)
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

  function activateBlock(
    block: ChordBlockState,
    { revealToolbar = false }: { revealToolbar?: boolean } = {},
  ) {
    setSelectedBlockId(block.id)
    setSelectedLayoutRowId(block.rowId)
    setEditingLyricsRowId(null)
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(revealToolbar ? block.id : null)
  }

  function selectLayoutRow(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    setSelectedLayoutRowId(rowId)
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
  }

  function startLyricsLineEditing(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    setSelectedLayoutRowId(rowId)
    setEditingLyricsRowId(rowId)
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
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

    setSelectedLayoutRowId(rowId)
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

  function addChordDraftToStock(draft: ChordDraftState): boolean {
    if (
      stockChords.some((stockChord) =>
        isSameFretting(stockChord.fretting, draft.fretting),
      )
    ) {
      return false
    }

    commitChordDraft(draft)
    setStockChords((currentStockChords) => {
      if (
        currentStockChords.some((stockChord) =>
          isSameFretting(stockChord.fretting, draft.fretting),
        )
      ) {
        return currentStockChords
      }

      return [
        ...currentStockChords,
        createStockChord(
          copyFretting(draft.fretting),
          toStoredDisplayName(draft.chordName),
        ),
      ]
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
    updateBlockById(chordModal.blockId, (block) => ({
      ...block,
      displayName: toStoredDisplayName(draft.chordName),
      fretting: copyFretting(draft.fretting),
    }))
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

    setStockChords((currentStockChords) =>
      currentStockChords.filter((entry) => entry.id !== stockChordId),
    )
    setAppError(null)
  }

  function handleDuplicateBlock() {
    const selectedIndex = blocks.findIndex(
      (block) => block.id === selectedBlockId,
    )
    const nextSelectedBlock = blocks[selectedIndex]

    if (selectedIndex < 0 || !nextSelectedBlock) {
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

    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
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
    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
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
    hideLayoutAddHint()
    hideLayoutHoverHint()
    hideLayoutRowAddHint()
    setVisibleBlockToolbarId(null)
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

    hideLayoutHoverHint()
    setVisibleBlockToolbarId(null)
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
      selectedBlockRowId === rowToRemove.id
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
  const renderStockAddButton = (className: string) => (
    <div className="stock-add-button-wrapper">
      <button
        aria-label={text.openStockAddModal}
        className={className}
        onBlur={hideStockAddHint}
        onClick={openStockChordModal}
        onFocus={showStockAddHintImmediately}
        onMouseEnter={scheduleStockAddHint}
        onMouseLeave={hideStockAddHint}
        type="button"
      >
        +
      </button>
      {showStockAddHint ? (
        <div
          aria-hidden="true"
          className="layout-block-hover-hint stock-add-tooltip"
        >
          {text.stockAddTooltip}
        </div>
      ) : null}
    </div>
  )

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

      <section className="panel stock-panel" aria-labelledby="stock-heading">
        <div className="panel-heading stock-panel-heading">
          <h2 id="stock-heading">{text.stockHeading}</h2>
        </div>

        {hasStockEntries ? (
          <div className="stock-grid">
            {stockEntries.map(({ stockChord, summary, displayName }) => (
              <article
                className="stock-card dismissible-card"
                key={stockChord.id}
              >
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
                    tightTopSpacing
                    viewport={summary.viewport}
                  />
                </div>
              </article>
            ))}
            {renderStockAddButton('card-add-button stock-add-button')}
          </div>
        ) : (
          <div className="stock-empty-state">
            {renderStockAddButton(
              'card-add-button stock-add-button stock-add-button-empty',
            )}
            <p className="stock-empty">{text.stockEmpty}</p>
          </div>
        )}
      </section>

      <section className="panel layout-panel" aria-labelledby="layout-heading">
        <div className="panel-heading">
          <h2 id="layout-heading">{text.layoutHeading}</h2>
        </div>

        <div className="layout-stage-frame" ref={layoutStageFrameRef}>
          {!isExportingPdf && visibleBlockToolbarId && layoutToolbarAnchor ? (
            <div
              className="layout-block-toolbar"
              ref={layoutToolbarRef}
              style={{
                left: `${layoutToolbarAnchor.left + layoutToolbarAnchor.width / 2}px`,
                top: `${layoutToolbarAnchor.top}px`,
              }}
            >
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
          ) : null}
          {showLayoutHoverHint && layoutHintAnchor ? (
            <div
              aria-hidden="true"
              className="layout-block-hover-hint"
              style={{
                left: `${layoutHintAnchor.left + layoutHintAnchor.width / 2}px`,
                top: `${layoutHintAnchor.top + layoutHintAnchor.height}px`,
              }}
            >
              {text.layoutDragHint}
            </div>
          ) : null}
          {showLayoutAddHint && layoutAddHintAnchor ? (
            <div
              aria-hidden="true"
              className="layout-block-hover-hint layout-add-tooltip"
              style={{
                left: `${layoutAddHintAnchor.left + layoutAddHintAnchor.width / 2}px`,
                top: `${layoutAddHintAnchor.top + layoutAddHintAnchor.height}px`,
              }}
            >
              {text.openLayoutAddModal}
            </div>
          ) : null}
          {shouldShowLayoutRowAddHint && layoutRowAddHintAnchor ? (
            <div
              aria-hidden="true"
              className="layout-block-hover-hint layout-row-add-tooltip"
              style={{
                left: `${layoutRowAddHintAnchor.left + layoutRowAddHintAnchor.width / 2}px`,
                top: `${layoutRowAddHintAnchor.top + layoutRowAddHintAnchor.height}px`,
              }}
            >
              {text.addRow}
            </div>
          ) : null}

          <div className="layout-stage-wrapper" ref={layoutStageWrapperRef}>
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
                      rowEntry.row.id === selectedLayoutRow.id
                        ? ' selected'
                        : ''
                    }`}
                    key={rowEntry.row.id}
                  >
                    <div className="layout-row-header">
                      <h3
                        className="visually-hidden"
                        id={`layout-row-heading-${rowEntry.row.id}`}
                      >
                        {rowLabel}
                      </h3>
                      <button
                        aria-label={text.removeLayoutRowAria}
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
                            entry.block.id === selectedBlockId
                              ? ' selected'
                              : ''
                          }`}
                          data-dragging={
                            draggingBlockId === entry.block.id
                              ? 'true'
                              : undefined
                          }
                          data-layout-block-id={entry.block.id}
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
                            onBlur={() => hideLayoutHoverHint(entry.block.id)}
                            onClick={() =>
                              activateBlock(entry.block, {
                                revealToolbar: true,
                              })
                            }
                            onFocus={() =>
                              showLayoutHoverHintImmediately(entry.block.id)
                            }
                            onMouseEnter={() =>
                              scheduleLayoutHoverHint(entry.block.id)
                            }
                            onMouseLeave={() =>
                              hideLayoutHoverHint(entry.block.id)
                            }
                            onPointerDown={(event) =>
                              handleLayoutBlockPointerDown(
                                entry.block,
                                entry.hasFollowingBlock,
                                entry.minXOffset,
                                event,
                              )
                            }
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
                        aria-label={text.openLayoutAddModal}
                        className="layout-add-button"
                        onBlur={() => hideLayoutAddHint(rowEntry.row.id)}
                        onClick={() => openLayoutChordModal(rowEntry.row.id)}
                        onFocus={() =>
                          showLayoutAddHintImmediately(rowEntry.row.id)
                        }
                        onMouseEnter={() =>
                          scheduleLayoutAddHint(rowEntry.row.id)
                        }
                        onMouseLeave={() => hideLayoutAddHint(rowEntry.row.id)}
                        ref={(node) => {
                          layoutAddButtonRefs.current[rowEntry.row.id] = node
                        }}
                        style={{ left: `${rowEntry.addButtonLeft}px` }}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    {isExportingPdf ||
                    editingLyricsRowId !== rowEntry.row.id ? (
                      <div
                        aria-label={lyricsLineLabel}
                        className={`lyrics-line lyrics-line-text${
                          showLyricsPlaceholder
                            ? ' lyrics-line-placeholder'
                            : ''
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
                onBlur={hideLayoutRowAddHint}
                onClick={handleAddLayoutRow}
                onFocus={showLayoutRowAddHintImmediately}
                onMouseEnter={scheduleLayoutRowAddHint}
                onMouseLeave={hideLayoutRowAddHint}
                ref={layoutRowAddButtonRef}
                type="button"
              >
                +
              </button>
            </div>
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

            <form
              className="chord-modal-form"
              onSubmit={handleSubmitChordModal}
            >
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
                <>
                  <div className="modal-actions modal-layout-actions">
                    <button
                      className="accent-button modal-submit-button"
                      type="submit"
                    >
                      {modalSubmitLabel}
                    </button>
                    <button
                      className="accent-button modal-submit-button"
                      disabled={isModalDraftStocked}
                      onClick={handleAddChordModalDraftToStock}
                      type="button"
                    >
                      {isModalDraftStocked
                        ? text.alreadyStockedButton
                        : text.addToStock}
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
                                    handleAddStockChordFromModal(stockChord.id)
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

              {chordModal.kind !== 'layout' ? (
                <div className="modal-actions">
                  <button
                    className="accent-button modal-submit-button"
                    disabled={
                      chordModal.kind === 'stock' && isModalChordStocked
                    }
                    type="submit"
                  >
                    {modalSubmitLabel}
                  </button>
                </div>
              ) : null}
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

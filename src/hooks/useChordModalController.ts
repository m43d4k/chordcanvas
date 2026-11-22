import { useCallback, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type {
  ChordQuality,
  Fretting,
  PitchClassName,
  PlayedNote,
  StringState,
} from '../music/chords'
import type {
  ChordBlockState,
  LayoutRowState,
  StockChordState,
} from '../project/projectFile'
import {
  createChordDraft,
  createChordDraftFromBlock,
  createSingleNoteDraft,
  type ChordDraftState,
  type ChordModalSession,
  type CurrentChordDraftSource,
  syncDraftViewport,
  updateDraftForm,
  updateDraftManualFretCount,
  updateDraftManualStartFret,
  updateDraftName,
  updateDraftNote,
  updateDraftNotePosition,
  updateDraftQuality,
  updateDraftRoot,
  updateDraftStringState,
} from '../features/chordModal/draft'

export interface UseChordModalControllerOptions {
  blocks: readonly ChordBlockState[]
  currentDraftSource: CurrentChordDraftSource
  layoutRows: readonly LayoutRowState[]
  onAddLayoutBlockFromDraft: (rowId: string, draft: ChordDraftState) => void
  onAddStockChordFromDraft: (draft: ChordDraftState) => boolean
  onAddStockChordToLayout: (stockChordId: string, rowId: string) => void
  onSelectLayoutRow: (rowId: string) => void
  onUpdateBlockFromDraft: (blockId: string, draft: ChordDraftState) => void
  stockChords: readonly StockChordState[]
}

interface UseChordModalControllerResult {
  chordModal: ChordModalSession | null
  closeChordModal: () => void
  handleAddChordModalDraftToStock: () => void
  handleAddStockChordFromModal: (stockChordId: string) => void
  handleChordModalFormChange: (event: ChangeEvent<HTMLSelectElement>) => void
  handleChordModalManualFretCountChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void
  handleChordModalManualStartFretChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void
  handleChordModalNameChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleChordModalNoteChange: (note: PitchClassName) => void
  handleChordModalNotePositionChange: (position: PlayedNote) => void
  handleChordModalModeChange: (isSingleNote: boolean) => void
  handleChordModalQualityChange: (
    event: ChangeEvent<HTMLSelectElement>,
  ) => void
  handleChordModalRootChange: (event: ChangeEvent<HTMLSelectElement>) => void
  handleChordModalStringStateChange: (
    stringIndex: number,
    nextState: StringState,
  ) => void
  handleChordModalViewportSync: () => void
  handleSubmitChordModal: (event: FormEvent<HTMLFormElement>) => void
  isModalDraftStocked: boolean
  modalDraft: ChordDraftState | null
  openEditChordModal: (blockId: string) => void
  openLayoutChordModal: (rowId: string) => void
  openStockChordModal: () => void
}

function isSameFretting(left: Fretting, right: Fretting): boolean {
  return left.every((state, index) => state === right[index])
}

export function useChordModalController({
  blocks,
  currentDraftSource,
  layoutRows,
  onAddLayoutBlockFromDraft,
  onAddStockChordFromDraft,
  onAddStockChordToLayout,
  onSelectLayoutRow,
  onUpdateBlockFromDraft,
  stockChords,
}: UseChordModalControllerOptions): UseChordModalControllerResult {
  const [chordModal, setChordModal] = useState<ChordModalSession | null>(null)
  const modalDraft = chordModal?.draft ?? null
  const isModalDraftStocked = modalDraft
    ? stockChords.some(
        (stockChord) =>
          stockChord.isSingleNote === modalDraft.isSingleNote &&
          isSameFretting(stockChord.fretting, modalDraft.fretting),
      )
    : false

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
      draft: createChordDraft(currentDraftSource),
    })
  }

  function openLayoutChordModal(rowId: string) {
    if (!layoutRows.some((row) => row.id === rowId)) {
      return
    }

    onSelectLayoutRow(rowId)
    setChordModal({
      kind: 'layout',
      draft: createChordDraft(currentDraftSource),
      targetRowId: rowId,
    })
  }

  function openEditChordModal(blockId: string) {
    const blockToEdit = blocks.find((block) => block.id === blockId)

    if (!blockToEdit) {
      return
    }

    setChordModal({
      blockId: blockToEdit.id,
      draft: createChordDraftFromBlock(blockToEdit, currentDraftSource),
      kind: 'edit',
    })
  }

  const closeChordModal = useCallback(() => {
    setChordModal(null)
  }, [])

  function handleChordModalRootChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRoot = event.target.value as PitchClassName

    updateChordModalDraft((draft) => updateDraftRoot(draft, nextRoot))
  }

  function handleChordModalQualityChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const nextQuality = event.target.value as ChordQuality

    updateChordModalDraft((draft) => updateDraftQuality(draft, nextQuality))
  }

  function handleChordModalFormChange(event: ChangeEvent<HTMLSelectElement>) {
    updateChordModalDraft((draft) => updateDraftForm(draft, event.target.value))
  }

  function handleChordModalNameChange(event: ChangeEvent<HTMLInputElement>) {
    updateChordModalDraft((draft) => updateDraftName(draft, event.target.value))
  }

  function handleChordModalModeChange(isSingleNote: boolean) {
    setChordModal((current) => {
      if (
        current?.kind !== 'layout' ||
        Boolean(current.draft.isSingleNote) === isSingleNote
      ) {
        return current
      }

      return {
        ...current,
        alternateDraft: current.draft,
        draft:
          current.alternateDraft ?? createSingleNoteDraft(currentDraftSource),
      }
    })
  }

  function handleChordModalNoteChange(note: PitchClassName) {
    updateChordModalDraft((draft) => updateDraftNote(draft, note))
  }

  function handleChordModalNotePositionChange(position: PlayedNote) {
    updateChordModalDraft((draft) => updateDraftNotePosition(draft, position))
  }

  function handleChordModalManualStartFretChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    updateChordModalDraft((draft) =>
      updateDraftManualStartFret(draft, event.target.value),
    )
  }

  function handleChordModalManualFretCountChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    updateChordModalDraft((draft) =>
      updateDraftManualFretCount(draft, event.target.value),
    )
  }

  function handleChordModalStringStateChange(
    stringIndex: number,
    nextState: StringState,
  ) {
    updateChordModalDraft((draft) =>
      updateDraftStringState(draft, stringIndex, nextState),
    )
  }

  function handleChordModalViewportSync() {
    updateChordModalDraft((draft) => syncDraftViewport(draft, draft.fretting))
  }

  function handleSubmitChordModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!chordModal) {
      return
    }

    const { draft } = chordModal

    if (chordModal.kind === 'stock') {
      if (!onAddStockChordFromDraft(draft)) {
        return
      }

      closeChordModal()
      return
    }

    if (chordModal.kind === 'layout') {
      onAddLayoutBlockFromDraft(chordModal.targetRowId, draft)
      closeChordModal()
      return
    }

    if (!blocks.some((block) => block.id === chordModal.blockId)) {
      closeChordModal()
      return
    }

    onUpdateBlockFromDraft(chordModal.blockId, draft)
    closeChordModal()
  }

  function handleAddStockChordFromModal(stockChordId: string) {
    if (!chordModal || chordModal.kind !== 'layout') {
      return
    }

    onAddStockChordToLayout(stockChordId, chordModal.targetRowId)
    closeChordModal()
  }

  function handleAddChordModalDraftToStock() {
    if (!chordModal || chordModal.kind !== 'layout') {
      return
    }

    onAddStockChordFromDraft(chordModal.draft)
  }

  return {
    chordModal,
    closeChordModal,
    handleAddChordModalDraftToStock,
    handleAddStockChordFromModal,
    handleChordModalFormChange,
    handleChordModalManualFretCountChange,
    handleChordModalManualStartFretChange,
    handleChordModalModeChange,
    handleChordModalNameChange,
    handleChordModalNoteChange,
    handleChordModalNotePositionChange,
    handleChordModalQualityChange,
    handleChordModalRootChange,
    handleChordModalStringStateChange,
    handleChordModalViewportSync,
    handleSubmitChordModal,
    isModalDraftStocked,
    modalDraft,
    openEditChordModal,
    openLayoutChordModal,
    openStockChordModal,
  }
}

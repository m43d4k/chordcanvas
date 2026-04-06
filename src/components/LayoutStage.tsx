import type {
  CSSProperties,
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'
import ChordDiagram from './ChordDiagram'
import type { LayoutOverlayAnchor } from '../hooks/useLayoutOverlayAnchors'
import type { LayoutEntriesResult } from '../layout/layoutEntries'
import type { ChordBlockState } from '../project/projectFile'
import type { UiText } from '../uiText'

interface LayoutStageProps {
  activeRowBlockIds: readonly string[]
  activeRowSelectionIndex: number
  blocksLength: number
  draggingBlockId: string | null
  editingLyricsRowId: string | null
  isExportingPdf: boolean
  layoutAddButtonRefs: RefObject<Record<string, HTMLButtonElement | null>>
  layoutAddHintAnchor: LayoutOverlayAnchor | null
  layoutEntries: LayoutEntriesResult
  layoutHintAnchor: LayoutOverlayAnchor | null
  layoutRowAddButtonRef: RefObject<HTMLButtonElement | null>
  layoutRowAddHintAnchor: LayoutOverlayAnchor | null
  layoutStageFrameRef: RefObject<HTMLDivElement | null>
  layoutStageRef: RefObject<HTMLDivElement | null>
  layoutStageStyle: CSSProperties
  layoutStageWrapperRef: RefObject<HTMLDivElement | null>
  layoutToolbarAnchor: LayoutOverlayAnchor | null
  layoutToolbarRef: RefObject<HTMLDivElement | null>
  layoutRowsLength: number
  lyricsInputRefs: RefObject<Record<string, HTMLInputElement | null>>
  highlightedBlockId: string | null
  selectedBlockId: string
  selectedLayoutRowId: string
  shouldShowLayoutRowAddHint: boolean
  showLayoutAddHint: boolean
  showLayoutHoverHint: boolean
  text: UiText
  visibleBlockToolbarId: string | null
  onActivateBlock: (
    block: ChordBlockState,
    options?: { playAudio?: boolean; revealToolbar?: boolean },
  ) => void
  onAddLayoutRow: () => void
  onDeleteBlock: (blockId?: string) => void
  onDeleteLayoutRow: (rowId: string) => void
  onDuplicateBlock: () => void
  onEditSelectedChord: () => void
  onHideLayoutAddHint: (rowId?: string) => void
  onHideLayoutHoverHint: (blockId?: string) => void
  onHideLayoutRowAddHint: () => void
  onLayoutBlockPointerDown: (
    block: ChordBlockState,
    hasFollowingBlock: boolean,
    minXOffset: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onLyricsBlur: () => void
  onLayoutRowInputChange: (
    rowId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void
  onMoveBlock: (direction: -1 | 1) => void
  onOpenLayoutChordModal: (rowId: string) => void
  onPlayLayoutChord: (block: ChordBlockState) => void
  onScheduleLayoutAddHint: (rowId: string) => void
  onScheduleLayoutHoverHint: (blockId: string) => void
  onScheduleLayoutRowAddHint: () => void
  onSelectLayoutRow: (rowId: string) => void
  onShowLayoutAddHintImmediately: (rowId: string) => void
  onShowLayoutHoverHintImmediately: (blockId: string) => void
  onShowLayoutRowAddHintImmediately: () => void
  onStartLyricsLineEditing: (rowId: string) => void
}

function LayoutStage({
  activeRowBlockIds,
  activeRowSelectionIndex,
  blocksLength,
  draggingBlockId,
  editingLyricsRowId,
  isExportingPdf,
  layoutAddButtonRefs,
  layoutAddHintAnchor,
  layoutEntries,
  layoutHintAnchor,
  layoutRowAddButtonRef,
  layoutRowAddHintAnchor,
  layoutRowsLength,
  layoutStageFrameRef,
  layoutStageRef,
  layoutStageStyle,
  layoutStageWrapperRef,
  layoutToolbarAnchor,
  layoutToolbarRef,
  lyricsInputRefs,
  highlightedBlockId,
  isAudioMuted,
  selectedBlockId,
  selectedLayoutRowId,
  shouldShowLayoutRowAddHint,
  showLayoutAddHint,
  showLayoutHoverHint,
  text,
  visibleBlockToolbarId,
  onActivateBlock,
  onAddLayoutRow,
  onDeleteBlock,
  onDeleteLayoutRow,
  onDuplicateBlock,
  onEditSelectedChord,
  onHideLayoutAddHint,
  onHideLayoutHoverHint,
  onHideLayoutRowAddHint,
  onLayoutBlockPointerDown,
  onLyricsBlur,
  onLayoutRowInputChange,
  onMoveBlock,
  onOpenLayoutChordModal,
  onPlayLayoutChord,
  onScheduleLayoutAddHint,
  onScheduleLayoutHoverHint,
  onScheduleLayoutRowAddHint,
  onSelectLayoutRow,
  onShowLayoutAddHintImmediately,
  onShowLayoutHoverHintImmediately,
  onShowLayoutRowAddHintImmediately,
  onStartLyricsLineEditing,
}: LayoutStageProps) {
  return (
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
              onClick={onEditSelectedChord}
              type="button"
            >
              {text.editSelectedChord}
            </button>
            <button onClick={onDuplicateBlock} type="button">
              {text.duplicateSelectedChord}
            </button>
            <button
              disabled={activeRowSelectionIndex <= 0}
              onClick={() => onMoveBlock(-1)}
              type="button"
            >
              {text.moveLeft}
            </button>
            <button
              disabled={
                activeRowSelectionIndex < 0 ||
                activeRowSelectionIndex === activeRowBlockIds.length - 1
              }
              onClick={() => onMoveBlock(1)}
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
                    rowEntry.row.id === selectedLayoutRowId ? ' selected' : ''
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
                      disabled={layoutRowsLength === 1}
                      onClick={() => onDeleteLayoutRow(rowEntry.row.id)}
                      type="button"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>

                  <div className="layout-chord-layer">
                    {rowEntry.entries.map((entry) => {
                      const isDismissButtonVisible =
                        visibleBlockToolbarId === entry.block.id
                      const isSelected = isExportingPdf
                        ? entry.block.id === selectedBlockId
                        : highlightedBlockId === entry.block.id

                      return (
                        <div
                          className={`layout-chord-block dismissible-card${
                            isSelected ? ' selected' : ''
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
                          {isDismissButtonVisible ? (
                            <button
                              aria-label={text.removeLayoutChordAria(
                                entry.displayName,
                              )}
                              className="card-dismiss-button layout-card-dismiss-button"
                              disabled={blocksLength === 1}
                              onClick={(event) => {
                                event.stopPropagation()
                                onDeleteBlock(entry.block.id)
                              }}
                              type="button"
                            >
                              <span aria-hidden="true">×</span>
                            </button>
                          ) : null}
                          <button
                            aria-label={text.selectLayoutBlockAria(
                              entry.displayName,
                            )}
                            className="chord-preview-block layout-chord-block-button"
                            draggable={false}
                            onBlur={() => onHideLayoutHoverHint(entry.block.id)}
                            onClick={() =>
                              onActivateBlock(entry.block, {
                                revealToolbar: true,
                              })
                            }
                            onFocus={() =>
                              onShowLayoutHoverHintImmediately(entry.block.id)
                            }
                            onMouseEnter={() =>
                              onScheduleLayoutHoverHint(entry.block.id)
                            }
                            onMouseLeave={() =>
                              onHideLayoutHoverHint(entry.block.id)
                            }
                            onPointerDown={(event) =>
                              onLayoutBlockPointerDown(
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
                      )
                    })}

                    <button
                      aria-label={text.openLayoutAddModal}
                      className="layout-add-button"
                      onBlur={() => onHideLayoutAddHint(rowEntry.row.id)}
                      onClick={() => onOpenLayoutChordModal(rowEntry.row.id)}
                      onFocus={() =>
                        onShowLayoutAddHintImmediately(rowEntry.row.id)
                      }
                      onMouseEnter={() =>
                        onScheduleLayoutAddHint(rowEntry.row.id)
                      }
                      onMouseLeave={() => onHideLayoutAddHint(rowEntry.row.id)}
                      ref={(node) => {
                        layoutAddButtonRefs.current[rowEntry.row.id] = node
                      }}
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
                      onClick={() => onStartLyricsLineEditing(rowEntry.row.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onStartLyricsLineEditing(rowEntry.row.id)
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
                      onBlur={onLyricsBlur}
                      onChange={(event) =>
                        onLayoutRowInputChange(rowEntry.row.id, event)
                      }
                      onFocus={() => onSelectLayoutRow(rowEntry.row.id)}
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
              onBlur={onHideLayoutRowAddHint}
              onClick={onAddLayoutRow}
              onFocus={onShowLayoutRowAddHintImmediately}
              onMouseEnter={onScheduleLayoutRowAddHint}
              onMouseLeave={onHideLayoutRowAddHint}
              ref={layoutRowAddButtonRef}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LayoutStage

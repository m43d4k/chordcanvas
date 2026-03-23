import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import type {
  ChordBlockState,
  LayoutRowState,
} from '../project/projectFile'

export interface LayoutOverlayAnchor {
  height: number
  left: number
  top: number
  width: number
}

interface UseLayoutOverlayAnchorsArgs {
  addButtonRefs: RefObject<Record<string, HTMLButtonElement | null>>
  blocks: readonly ChordBlockState[]
  frameRef: RefObject<HTMLDivElement | null>
  hoveredBlockId: string | null
  hoveredLayoutAddRowId: string | null
  layoutRows: readonly LayoutRowState[]
  rowAddButtonRef: RefObject<HTMLButtonElement | null>
  selectedBlockId: string
  shouldShowLayoutRowAddHint: boolean
  stageRef: RefObject<HTMLDivElement | null>
  visibleBlockToolbarId: string | null
  wrapperRef: RefObject<HTMLDivElement | null>
}

interface LayoutOverlayAnchorsState {
  layoutAddHintAnchor: LayoutOverlayAnchor | null
  layoutHintAnchor: LayoutOverlayAnchor | null
  layoutRowAddHintAnchor: LayoutOverlayAnchor | null
  layoutToolbarAnchor: LayoutOverlayAnchor | null
}

function getAnchorForElement(
  frameElement: HTMLElement | null,
  element: HTMLElement | null,
): LayoutOverlayAnchor | null {
  if (!frameElement || !element) {
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

export function useLayoutOverlayAnchors({
  addButtonRefs,
  blocks,
  frameRef,
  hoveredBlockId,
  hoveredLayoutAddRowId,
  layoutRows,
  rowAddButtonRef,
  selectedBlockId,
  shouldShowLayoutRowAddHint,
  stageRef,
  visibleBlockToolbarId,
  wrapperRef,
}: UseLayoutOverlayAnchorsArgs): LayoutOverlayAnchorsState {
  const [anchors, setAnchors] = useState<LayoutOverlayAnchorsState>({
    layoutAddHintAnchor: null,
    layoutHintAnchor: null,
    layoutRowAddHintAnchor: null,
    layoutToolbarAnchor: null,
  })

  useLayoutEffect(() => {
    function getBlockAnchor(blockId: string | null): LayoutOverlayAnchor | null {
      if (!blockId) {
        return null
      }

      return getAnchorForElement(
        frameRef.current,
        stageRef.current?.querySelector<HTMLElement>(
          `[data-layout-block-id="${blockId}"]`,
        ) ?? null,
      )
    }

    function updateAnchors() {
      setAnchors({
        layoutAddHintAnchor: hoveredLayoutAddRowId
          ? getAnchorForElement(
              frameRef.current,
              addButtonRefs.current[hoveredLayoutAddRowId] ?? null,
            )
          : null,
        layoutHintAnchor: getBlockAnchor(hoveredBlockId),
        layoutRowAddHintAnchor: shouldShowLayoutRowAddHint
          ? getAnchorForElement(frameRef.current, rowAddButtonRef.current)
          : null,
        layoutToolbarAnchor: getBlockAnchor(visibleBlockToolbarId),
      })
    }

    updateAnchors()

    if (
      !visibleBlockToolbarId &&
      !hoveredBlockId &&
      !hoveredLayoutAddRowId &&
      !shouldShowLayoutRowAddHint
    ) {
      return
    }

    const wrapperElement = wrapperRef.current

    window.addEventListener('resize', updateAnchors)
    wrapperElement?.addEventListener('scroll', updateAnchors, {
      passive: true,
    })

    return () => {
      window.removeEventListener('resize', updateAnchors)
      wrapperElement?.removeEventListener('scroll', updateAnchors)
    }
  }, [
    addButtonRefs,
    blocks,
    frameRef,
    hoveredBlockId,
    hoveredLayoutAddRowId,
    layoutRows,
    rowAddButtonRef,
    selectedBlockId,
    shouldShowLayoutRowAddHint,
    stageRef,
    visibleBlockToolbarId,
    wrapperRef,
  ])

  return anchors
}

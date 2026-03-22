import { describe, expect, it, vi } from 'vitest'
import { exportLayoutStagePdf } from './layoutPdf'

const pdfMocks = vi.hoisted(() => {
  const html2canvas = vi.fn()
  const pdfInstances: Array<{
    addImage: ReturnType<typeof vi.fn>
    addPage: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
    setDocumentProperties: ReturnType<typeof vi.fn>
  }> = []
  const jsPDF = vi.fn(function JsPdfMock() {
    const instance = {
      addImage: vi.fn(),
      addPage: vi.fn(),
      internal: {
        pageSize: {
          getHeight: () => 595.28,
          getWidth: () => 841.89,
        },
      },
      save: vi.fn().mockResolvedValue(undefined),
      setDocumentProperties: vi.fn(),
    }

    pdfInstances.push(instance)
    return instance
  })

  return {
    html2canvas,
    jsPDF,
    pdfInstances,
  }
})

vi.mock('html2canvas', () => ({
  default: pdfMocks.html2canvas,
}))

vi.mock('jspdf', () => ({
  jsPDF: pdfMocks.jsPDF,
}))

describe('exportLayoutStagePdf', () => {
  it('captures the layout stage and saves a paginated pdf', async () => {
    const stageElement = document.createElement('div')
    const sourceCanvas = document.createElement('canvas')
    const fakeContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => fakeContext)

    Object.defineProperty(stageElement, 'scrollWidth', {
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(stageElement, 'scrollHeight', {
      configurable: true,
      value: 900,
    })
    stageElement.getBoundingClientRect = () =>
      ({
        height: 900,
        width: 1200,
      }) as DOMRect
    sourceCanvas.width = 1200
    sourceCanvas.height = 1600
    pdfMocks.html2canvas.mockResolvedValue(sourceCanvas)

    try {
      await exportLayoutStagePdf(stageElement, 'layout-export.pdf')
    } finally {
      getContextSpy.mockRestore()
    }

    const pdfInstance = pdfMocks.pdfInstances[0]
    const html2CanvasOptions = pdfMocks.html2canvas.mock.calls[0]?.[1]

    expect(pdfMocks.html2canvas).toHaveBeenCalledWith(
      stageElement,
      expect.objectContaining({
        backgroundColor: '#fffdf8',
        height: 900,
        width: 1200,
      }),
    )
    expect(html2CanvasOptions?.scale).toBeCloseTo(2.701, 3)
    expect(pdfInstance?.setDocumentProperties).toHaveBeenCalled()
    expect(pdfInstance?.addImage).toHaveBeenCalledTimes(2)
    expect(pdfInstance?.addPage).toHaveBeenCalledTimes(1)
    expect(pdfInstance?.save).toHaveBeenCalledWith('layout-export.pdf', {
      returnPromise: true,
    })
    expect(stageElement).not.toHaveAttribute('data-exporting-pdf')
  })
})

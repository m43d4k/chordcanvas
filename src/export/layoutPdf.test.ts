import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportLayoutStageLongPdf, exportLayoutStagePdf } from './layoutPdf'

const pdfMocks = vi.hoisted(() => {
  function getPdfPageSize(options?: {
    format?: string | number[]
    orientation?: string
  }) {
    if (Array.isArray(options?.format)) {
      return {
        height: options.format[1] ?? 841.89,
        width: options.format[0] ?? 595.28,
      }
    }

    const isPortrait =
      options?.orientation === undefined ||
      options.orientation === 'p' ||
      options.orientation === 'portrait'

    return {
      height: isPortrait ? 841.89 : 595.28,
      width: isPortrait ? 595.28 : 841.89,
    }
  }

  const html2canvas = vi.fn()
  const pdfInstances: Array<{
    addImage: ReturnType<typeof vi.fn>
    addPage: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
    setDisplayMode: ReturnType<typeof vi.fn>
    setDocumentProperties: ReturnType<typeof vi.fn>
  }> = []
  const jsPDF = vi.fn(function JsPdfMock(options?: {
    format?: string | number[]
    orientation?: string
  }) {
    const { height, width } = getPdfPageSize(options)
    const instance = {
      addImage: vi.fn(),
      addPage: vi.fn(),
      internal: {
        pageSize: {
          getHeight: () => height,
          getWidth: () => width,
        },
      },
      save: vi.fn().mockResolvedValue(undefined),
      setDisplayMode: vi.fn(),
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

const pdfLibMocks = vi.hoisted(() => {
  const documents: Array<{
    addPage: ReturnType<typeof vi.fn>
    embedPng: ReturnType<typeof vi.fn>
    page: {
      drawImage: ReturnType<typeof vi.fn>
    }
    save: ReturnType<typeof vi.fn>
    setSubject: ReturnType<typeof vi.fn>
    setTitle: ReturnType<typeof vi.fn>
  }> = []
  const PDFDocument = {
    create: vi.fn(async () => {
      const page = {
        drawImage: vi.fn(),
      }
      const document = {
        addPage: vi.fn(() => page),
        embedPng: vi.fn().mockResolvedValue({}),
        page,
        save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        setSubject: vi.fn(),
        setTitle: vi.fn(),
      }

      documents.push(document)
      return document
    }),
  }

  return {
    documents,
    PDFDocument,
  }
})

vi.mock('html2canvas', () => ({
  default: pdfMocks.html2canvas,
}))

vi.mock('jspdf', () => ({
  jsPDF: pdfMocks.jsPDF,
}))

vi.mock('pdf-lib', () => pdfLibMocks)

afterEach(() => {
  pdfMocks.html2canvas.mockReset()
  pdfMocks.jsPDF.mockClear()
  pdfMocks.pdfInstances.length = 0
  pdfLibMocks.PDFDocument.create.mockClear()
  pdfLibMocks.documents.length = 0
})

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
    sourceCanvas.height = 2500
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
    expect(pdfMocks.jsPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'a4',
        orientation: 'portrait',
        unit: 'pt',
      }),
    )
    expect(html2CanvasOptions?.scale).toBeCloseTo(1.845, 3)
    expect(pdfInstance?.setDocumentProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'ChordCanvas layout export',
        title: 'ChordCanvas Layout',
      }),
    )
    expect(pdfInstance?.setDisplayMode).toHaveBeenCalledWith('fullwidth')
    expect(pdfInstance?.addImage).toHaveBeenCalledTimes(2)
    expect(pdfInstance?.addPage).toHaveBeenCalledTimes(1)
    expect(pdfInstance?.save).toHaveBeenCalledWith('layout-export.pdf', {
      returnPromise: true,
    })
    expect(stageElement).not.toHaveAttribute('data-exporting-pdf')
  })

  it('captures the layout stage and saves a tall single-page pdf', async () => {
    const stageElement = document.createElement('div')
    const sourceCanvas = document.createElement('canvas')
    const toDataUrlSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,layout-long-pdf')
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:layout-long-pdf'),
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    })

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
    sourceCanvas.height = 2500
    pdfMocks.html2canvas.mockResolvedValue(sourceCanvas)

    try {
      await exportLayoutStageLongPdf(stageElement, 'layout-long-export.pdf')

      const pdfDocument = pdfLibMocks.documents[0]
      const html2CanvasOptions = pdfMocks.html2canvas.mock.calls[0]?.[1]
      const expectedContentWidth = 595.28 - 32 * 2
      const expectedRenderedHeight =
        (sourceCanvas.height * expectedContentWidth) / sourceCanvas.width
      const createObjectUrl = URL.createObjectURL as ReturnType<typeof vi.fn>
      const revokeObjectUrl = URL.revokeObjectURL as ReturnType<typeof vi.fn>

      expect(pdfMocks.html2canvas).toHaveBeenCalledWith(
        stageElement,
        expect.objectContaining({
          backgroundColor: '#fffdf8',
          height: 900,
          width: 1200,
        }),
      )
      expect(html2CanvasOptions?.scale).toBeCloseTo(1.845, 3)
      expect(pdfLibMocks.PDFDocument.create).toHaveBeenCalledTimes(1)
      expect(pdfDocument?.addPage).toHaveBeenCalledWith([
        595.28,
        expectedRenderedHeight + 32 * 2,
      ])
      expect(pdfDocument?.embedPng).toHaveBeenCalledWith(
        'data:image/png;base64,layout-long-pdf',
      )
      expect(pdfDocument?.page.drawImage).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          height: expectedRenderedHeight,
          width: expectedContentWidth,
          x: 32,
          y: 32,
        }),
      )
      expect(pdfDocument?.setTitle).toHaveBeenCalledWith(
        'ChordCanvas Layout Long',
      )
      expect(pdfDocument?.setSubject).toHaveBeenCalledWith(
        'ChordCanvas layout export',
      )
      expect(pdfDocument?.save).toHaveBeenCalledTimes(1)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(createObjectUrl).toHaveBeenCalledTimes(1)
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:layout-long-pdf')
      expect(stageElement).not.toHaveAttribute('data-exporting-pdf')
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
        writable: true,
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
        writable: true,
      })
      clickSpy.mockRestore()
      toDataUrlSpy.mockRestore()
    }
  })

  it('creates a taller single-page pdf when the layout is long', async () => {
    const stageElement = document.createElement('div')
    const sourceCanvas = document.createElement('canvas')
    const toDataUrlSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,layout-long-pdf')
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:layout-long-pdf'),
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    })

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
    sourceCanvas.height = 40_000
    pdfMocks.html2canvas.mockResolvedValue(sourceCanvas)

    try {
      await exportLayoutStageLongPdf(stageElement, 'layout-long-export.pdf')

      const pdfDocument = pdfLibMocks.documents[0]
      const addPageArgs = pdfDocument?.addPage.mock.calls[0]?.[0] as
        | [number, number]
        | undefined

      expect(addPageArgs?.[0]).toBeCloseTo(595.28, 2)
      expect(addPageArgs?.[1]).toBeGreaterThan(14_400)
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
        writable: true,
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
        writable: true,
      })
      clickSpy.mockRestore()
      toDataUrlSpy.mockRestore()
    }
  })

  it('throws a PdfExportError when a page slice canvas context is unavailable', async () => {
    const stageElement = document.createElement('div')
    const sourceCanvas = document.createElement('canvas')
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null)

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
    sourceCanvas.height = 2500
    pdfMocks.html2canvas.mockResolvedValue(sourceCanvas)

    try {
      await expect(
        exportLayoutStagePdf(stageElement, 'layout-export.pdf'),
      ).rejects.toMatchObject({
        code: 'canvasContextUnavailable',
      })
      expect(stageElement).not.toHaveAttribute('data-exporting-pdf')
    } finally {
      getContextSpy.mockRestore()
    }
  })
})

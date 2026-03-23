export const LAYOUT_PDF_FILE_NAME = 'chordcanvas-layout.pdf'
export const LAYOUT_LONG_PDF_FILE_NAME = 'chordcanvas-layout-long.pdf'

export type PdfExportErrorCode = 'canvasContextUnavailable'

export class PdfExportError extends Error {
  code: PdfExportErrorCode

  constructor(code: PdfExportErrorCode) {
    super(code)
    this.name = 'PdfExportError'
    this.code = code
  }
}

const EXPORT_BACKGROUND = '#fffdf8'
const EXPORT_MARGIN = 32
const EXPORT_TARGET_DPI = 300
const MAX_CAPTURE_SCALE = 4
const MAX_CANVAS_EDGE = 16_384
const MAX_CANVAS_PIXELS = 40_000_000
const PDF_POINTS_PER_INCH = 72
const PDF_PAGE_FORMAT = 'a4'
const PDF_PAGE_ORIENTATION = 'portrait'
const PDF_A4_PAGE_WIDTH = 595.28

interface PdfDocumentPropertiesTarget {
  setDocumentProperties: (properties: {
    subject: string
    title: string
  }) => void
  setDisplayMode: (zoom: 'fullwidth') => void
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
    ) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve())
      })
      return
    }

    setTimeout(resolve, 0)
  })
}

function getRenderSize(element: HTMLElement) {
  const rect = element.getBoundingClientRect()

  return {
    width: Math.max(1, Math.ceil(rect.width), element.scrollWidth),
    height: Math.max(1, Math.ceil(rect.height), element.scrollHeight),
  }
}

function getCaptureScale(
  renderWidth: number,
  renderHeight: number,
  contentWidth: number,
): number {
  const targetPixelWidth =
    (contentWidth / PDF_POINTS_PER_INCH) * EXPORT_TARGET_DPI
  const dpiScale = targetPixelWidth / renderWidth
  const edgeScale = Math.min(
    MAX_CANVAS_EDGE / renderWidth,
    MAX_CANVAS_EDGE / renderHeight,
  )
  const pixelScale = Math.sqrt(MAX_CANVAS_PIXELS / (renderWidth * renderHeight))

  return Math.max(
    1,
    Math.min(MAX_CAPTURE_SCALE, dpiScale, edgeScale, pixelScale),
  )
}

function createPageSlice(
  sourceCanvas: HTMLCanvasElement,
  sourceTop: number,
  sourceHeight: number,
): HTMLCanvasElement {
  const pageCanvas = document.createElement('canvas')
  const context = pageCanvas.getContext('2d')

  if (!context) {
    throw new PdfExportError('canvasContextUnavailable')
  }

  pageCanvas.width = sourceCanvas.width
  pageCanvas.height = sourceHeight
  context.fillStyle = EXPORT_BACKGROUND
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
  context.drawImage(
    sourceCanvas,
    0,
    sourceTop,
    sourceCanvas.width,
    sourceHeight,
    0,
    0,
    sourceCanvas.width,
    sourceHeight,
  )

  return pageCanvas
}

async function loadPdfDependencies() {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  return {
    html2canvas,
    jsPDF,
  }
}

async function captureStageCanvas(
  stageElement: HTMLElement,
  contentWidth: number,
  html2canvas: Awaited<ReturnType<typeof loadPdfDependencies>>['html2canvas'],
): Promise<HTMLCanvasElement> {
  const { width, height } = getRenderSize(stageElement)
  const captureScale = getCaptureScale(width, height, contentWidth)

  return html2canvas(stageElement, {
    backgroundColor: EXPORT_BACKGROUND,
    height,
    logging: false,
    scale: captureScale,
    useCORS: true,
    width,
    windowHeight: height,
    windowWidth: width,
  })
}

function setLayoutPdfDocumentProperties(
  pdf: PdfDocumentPropertiesTarget,
  title: string,
) {
  pdf.setDocumentProperties({
    subject: 'ChordCanvas layout export',
    title,
  })
  pdf.setDisplayMode('fullwidth')
}

function getPdfContentMetrics(pdf: {
  internal: {
    pageSize: {
      getHeight: () => number
      getWidth: () => number
    }
  }
}) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  return {
    contentHeight: pageHeight - EXPORT_MARGIN * 2,
    contentWidth: pageWidth - EXPORT_MARGIN * 2,
    pageHeight,
    pageWidth,
  }
}

function getA4ContentWidth() {
  return PDF_A4_PAGE_WIDTH - EXPORT_MARGIN * 2
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')

  downloadLink.href = objectUrl
  downloadLink.download = fileName
  downloadLink.click()
  URL.revokeObjectURL(objectUrl)
}

export async function exportLayoutStagePdf(
  stageElement: HTMLElement,
  fileName = LAYOUT_PDF_FILE_NAME,
): Promise<void> {
  stageElement.setAttribute('data-exporting-pdf', 'true')

  try {
    await waitForNextPaint()
    const { html2canvas, jsPDF } = await loadPdfDependencies()
    const pdf = new jsPDF({
      compress: true,
      format: PDF_PAGE_FORMAT,
      orientation: PDF_PAGE_ORIENTATION,
      unit: 'pt',
    })
    const { contentHeight, contentWidth } = getPdfContentMetrics(pdf)
    const canvas = await captureStageCanvas(
      stageElement,
      contentWidth,
      html2canvas,
    )
    const sourcePageHeight = Math.max(
      1,
      Math.floor((contentHeight * canvas.width) / contentWidth),
    )

    setLayoutPdfDocumentProperties(pdf, 'ChordCanvas Layout')

    let sourceTop = 0
    let pageIndex = 0

    while (sourceTop < canvas.height) {
      if (pageIndex > 0) {
        pdf.addPage()
      }

      const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceTop)
      const pageCanvas = createPageSlice(canvas, sourceTop, sliceHeight)
      const renderedHeight = (sliceHeight * contentWidth) / canvas.width

      pdf.addImage(
        pageCanvas,
        'PNG',
        EXPORT_MARGIN,
        EXPORT_MARGIN,
        contentWidth,
        renderedHeight,
        undefined,
        'FAST',
      )

      sourceTop += sliceHeight
      pageIndex += 1
    }

    await pdf.save(fileName, { returnPromise: true })
  } finally {
    stageElement.removeAttribute('data-exporting-pdf')
  }
}

export async function exportLayoutStageLongPdf(
  stageElement: HTMLElement,
  fileName = LAYOUT_LONG_PDF_FILE_NAME,
): Promise<void> {
  stageElement.setAttribute('data-exporting-pdf', 'true')

  try {
    await waitForNextPaint()
    const [{ html2canvas }, { PDFDocument }] = await Promise.all([
      loadPdfDependencies(),
      import('pdf-lib'),
    ])
    const contentWidth = getA4ContentWidth()
    const canvas = await captureStageCanvas(
      stageElement,
      contentWidth,
      html2canvas,
    )
    const renderedHeight = (canvas.height * contentWidth) / canvas.width
    const pageHeight = renderedHeight + EXPORT_MARGIN * 2
    const pdfDocument = await PDFDocument.create()
    const page = pdfDocument.addPage([PDF_A4_PAGE_WIDTH, pageHeight])
    const embeddedImage = await pdfDocument.embedPng(canvasToPngDataUrl(canvas))

    pdfDocument.setTitle('ChordCanvas Layout Long')
    pdfDocument.setSubject('ChordCanvas layout export')
    page.drawImage(embeddedImage, {
      height: renderedHeight,
      width: contentWidth,
      x: EXPORT_MARGIN,
      y: pageHeight - EXPORT_MARGIN - renderedHeight,
    })

    const pdfBytes = await pdfDocument.save()
    const pdfBuffer = new Uint8Array(pdfBytes.byteLength)

    pdfBuffer.set(pdfBytes)
    downloadBlob(new Blob([pdfBuffer], { type: 'application/pdf' }), fileName)
  } finally {
    stageElement.removeAttribute('data-exporting-pdf')
  }
}

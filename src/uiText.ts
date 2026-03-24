import type { PdfExportErrorCode } from './export/layoutPdf'
import type { ProjectFileErrorCode } from './project/projectFile'

export type Locale = 'ja' | 'en'

export interface UiText {
  languageToggleGroupLabel: string
  languageJa: string
  languageEn: string
  exportPdfA4: string
  exportPdfLong: string
  exportingPdf: string
  exportProject: string
  importProject: string
  projectFileInputAriaLabel: string
  generatorHeading: string
  rootNote: string
  chordQuality: string
  chordForm: string
  alreadyStockedButton: string
  addToStock: string
  editorHeading: string
  currentChord: string
  displayChordName: string
  useAutoDetectedName: string
  editingBlockNotice: (name: string) => string
  frettingInput: string
  autoAdjustViewport: string
  startFret: string
  visibleFretCount: string
  stringLabel: (stringNumber: number) => string
  stringMuteLabel: (stringNumber: number) => string
  stringOpenLabel: (stringNumber: number) => string
  stringFretLabel: (stringNumber: number, fret: number) => string
  infoHeading: string
  currentChordName: string
  candidateChordNames: string
  noCandidates: string
  bassNote: string
  chordTones: string
  uniqueNotes: string
  playedNotes: string
  stockHeading: string
  openStockAddModal: string
  stockAddTooltip: string
  stockCardToggleDescription: (expanded: boolean) => string
  addToRow: string
  addStockChordToLayoutAria: (name: string) => string
  removeStockChordAria: (name: string) => string
  stockEmpty: string
  layoutHeading: string
  openLayoutAddModal: string
  addRow: string
  removeLayoutRowAria: string
  lyricsLineLabel: (index: number) => string
  lyricsPlaceholder: string
  editSelectedChord: string
  duplicateSelectedChord: string
  removeLayoutChordAria: (name: string) => string
  selectLayoutBlockAria: (name: string) => string
  moveLeft: string
  moveRight: string
  saveChordChanges: string
  layoutDragHint: string
  layoutRowLabel: (index: number) => string
  chordBuilderModalTitle: string
  layoutAddModalTitle: string
  layoutEditModalTitle: string
  modalClose: string
  pdfExportFailedMissingStage: string
  describePdfExportError: (code: PdfExportErrorCode) => string
  pdfExportFailed: (message: string) => string
  unknownError: string
  describeProjectImportError: (
    code: ProjectFileErrorCode,
    fieldName?: string,
    id?: string,
  ) => string
  importFailed: (message: string) => string
}

export const UI_TEXT: Record<Locale, UiText> = {
  ja: {
    languageToggleGroupLabel: '言語切り替え',
    languageJa: '日本語',
    languageEn: 'English',
    exportPdfA4: '印刷用PDF',
    exportPdfLong: '表示用PDF',
    exportingPdf: 'PDF を書き出し中...',
    exportProject: 'プロジェクトを保存',
    importProject: 'プロジェクトを開く',
    projectFileInputAriaLabel: 'プロジェクト JSON ファイル',
    generatorHeading: 'コード選択',
    rootNote: 'ルート',
    chordQuality: 'コード種別',
    chordForm: '候補フォーム',
    alreadyStockedButton: 'このコードはストック済み',
    addToStock: 'ストックに追加',
    editorHeading: 'コードダイアグラム',
    currentChord: '現在のコード',
    displayChordName: '任意コード名',
    useAutoDetectedName: '空欄なら検出したコード名を使用。',
    editingBlockNotice: (name) => `${name} を編集中`,
    frettingInput: 'コードフォーム',
    autoAdjustViewport: '表示範囲を調整',
    startFret: '開始フレット',
    visibleFretCount: '表示フレット数',
    stringLabel: (stringNumber) => `${stringNumber}弦`,
    stringMuteLabel: (stringNumber) => `${stringNumber}弦 ミュート`,
    stringOpenLabel: (stringNumber) => `${stringNumber}弦 開放`,
    stringFretLabel: (stringNumber, fret) =>
      `${stringNumber}弦 ${fret}フレット`,
    infoHeading: 'コード情報',
    currentChordName: '現在のコード名',
    candidateChordNames: '候補コード名',
    noCandidates: '該当なし',
    bassNote: 'ベース音',
    chordTones: '構成音',
    uniqueNotes: 'ユニーク音',
    playedNotes: '各弦の音',
    stockHeading: 'コードストック',
    openStockAddModal: 'ストックにコードを追加',
    stockAddTooltip: 'ストックを追加',
    stockCardToggleDescription: (expanded) =>
      expanded ? '追加・削除ボタンを閉じる' : '追加・削除ボタンを表示',
    addToRow: '追加',
    addStockChordToLayoutAria: (name) => `${name} をコード譜に追加`,
    removeStockChordAria: (name) => `${name} をストックから削除`,
    stockEmpty: 'ストックはまだ空です。繰り返し使うコードを追加できます。',
    layoutHeading: 'コード譜編集',
    openLayoutAddModal: 'コードを追加',
    addRow: '行を追加',
    removeLayoutRowAria: '行を削除',
    lyricsLineLabel: (index) => `歌詞 ${index + 1} 行`,
    lyricsPlaceholder: '歌詞を入力。スペースで位置を調整。',
    editSelectedChord: '編集',
    duplicateSelectedChord: '複製',
    removeLayoutChordAria: (name) => `${name} をレイアウトから削除`,
    selectLayoutBlockAria: (name) => `${name} を選択`,
    moveLeft: '左へ',
    moveRight: '右へ',
    saveChordChanges: '変更を保存',
    layoutDragHint: '左右に移動',
    layoutRowLabel: (index) => `${index + 1}行目`,
    chordBuilderModalTitle: 'ストック用コードを追加',
    layoutAddModalTitle: 'コードを追加',
    layoutEditModalTitle: 'コードブロックを編集',
    modalClose: '閉じる',
    pdfExportFailedMissingStage:
      'PDF 出力に失敗しました: レイアウト領域を取得できませんでした。',
    describePdfExportError: (code) => {
      switch (code) {
        case 'canvasContextUnavailable':
          return 'PDF 出力用の canvas context を初期化できませんでした。'
      }
    },
    pdfExportFailed: (message) => `PDF 出力に失敗しました: ${message}`,
    unknownError: '不明なエラー',
    describeProjectImportError: (code, fieldName, id) => {
      switch (code) {
        case 'invalidJson':
          return 'JSON の解析に失敗しました。'
        case 'invalidProjectDocument':
          return 'project JSON の形式が不正です。'
        case 'unsupportedProjectFormat':
          return 'ChordCanvas project JSON ではありません。'
        case 'unsupportedProjectVersion':
          return '未対応の project version です。'
        case 'invalidProjectState':
          return 'project state の形式が不正です。'
        case 'layoutRowsRequired':
          return 'layoutRows は 1 件以上必要です。'
        case 'invalidStockChords':
          return 'stockChords の形式が不正です。'
        case 'blocksRequired':
          return 'blocks は 1 件以上必要です。'
        case 'missingSelectedBlock':
          return 'selectedBlockId が blocks に存在しません。'
        case 'missingSelectedLayoutRow':
          return 'selectedLayoutRowId が layoutRows に存在しません。'
        case 'duplicateLayoutRowId':
          return `layoutRows に重複した id${id ? ` (${id})` : ''} があります。`
        case 'duplicateStockChordId':
          return `stockChords に重複した id${id ? ` (${id})` : ''} があります。`
        case 'duplicateBlockId':
          return `blocks に重複した id${id ? ` (${id})` : ''} があります。`
        case 'missingBlockRow':
          return `${fieldName ?? 'rowId'} が存在しない rowId を参照しています。`
        case 'invalidField':
          return `${fieldName ?? 'field'} が不正です。`
      }
    },
    importFailed: (message) => `インポートに失敗しました: ${message}`,
  },
  en: {
    languageToggleGroupLabel: 'Language switcher',
    languageJa: '日本語',
    languageEn: 'English',
    exportPdfA4: 'Print PDF',
    exportPdfLong: 'Screen PDF',
    exportingPdf: 'Exporting PDF...',
    exportProject: 'Export Project',
    importProject: 'Import Project',
    projectFileInputAriaLabel: 'Project JSON file',
    generatorHeading: 'Chord Selection',
    rootNote: 'Root',
    chordQuality: 'Chord Quality',
    chordForm: 'Chord Shape',
    alreadyStockedButton: 'Already in Stock',
    addToStock: 'Add to Stock',
    editorHeading: 'Chord Diagram',
    currentChord: 'Current Chord',
    displayChordName: 'Custom Chord Name',
    useAutoDetectedName: 'Leave blank to use the detected name.',
    editingBlockNotice: (name) => `Editing ${name}`,
    frettingInput: 'Chord Form',
    autoAdjustViewport: 'Fit Viewport',
    startFret: 'Start Fret',
    visibleFretCount: 'Visible Frets',
    stringLabel: (stringNumber) => `Str ${stringNumber}`,
    stringMuteLabel: (stringNumber) => `Mute string ${stringNumber}`,
    stringOpenLabel: (stringNumber) => `Open string ${stringNumber}`,
    stringFretLabel: (stringNumber, fret) =>
      `String ${stringNumber}, fret ${fret}`,
    infoHeading: 'Chord Info',
    currentChordName: 'Current Chord Name',
    candidateChordNames: 'Equivalent Names',
    noCandidates: 'No matches',
    bassNote: 'Bass Note',
    chordTones: 'Chord notes',
    uniqueNotes: 'Unique Notes',
    playedNotes: 'String Notes',
    stockHeading: 'Chord Stock',
    openStockAddModal: 'Add chord to stock',
    stockAddTooltip: 'Add to stock',
    stockCardToggleDescription: (expanded) =>
      expanded ? 'Hide add and delete buttons' : 'Show add and delete buttons',
    addToRow: 'Add',
    addStockChordToLayoutAria: (name) => `Add ${name} to chart`,
    removeStockChordAria: (name) => `Remove ${name} from stock`,
    stockEmpty: 'Chord stock is empty. Add chords to reuse.',
    layoutHeading: 'Chord Chart Editor',
    openLayoutAddModal: 'Add chord',
    addRow: 'Add Row',
    removeLayoutRowAria: 'Delete row',
    lyricsLineLabel: (index) => `Lyrics line ${index + 1}`,
    lyricsPlaceholder: 'Enter lyrics. Use spaces to adjust alignment.',
    editSelectedChord: 'Edit',
    duplicateSelectedChord: 'Duplicate',
    removeLayoutChordAria: (name) => `Remove ${name} from layout`,
    selectLayoutBlockAria: (name) => `Select ${name} block`,
    moveLeft: 'Move Left',
    moveRight: 'Move Right',
    saveChordChanges: 'Save Changes',
    layoutDragHint: 'Move left or right',
    layoutRowLabel: (index) => `Row ${index + 1}`,
    chordBuilderModalTitle: 'Add Chord to Stock',
    layoutAddModalTitle: 'Add Chord',
    layoutEditModalTitle: 'Edit Chord Block',
    modalClose: 'Close',
    pdfExportFailedMissingStage:
      'PDF export failed: could not access the layout stage.',
    describePdfExportError: (code) => {
      switch (code) {
        case 'canvasContextUnavailable':
          return 'Could not initialize the canvas context for PDF export.'
      }
    },
    pdfExportFailed: (message) => `PDF export failed: ${message}`,
    unknownError: 'Unknown error',
    describeProjectImportError: (code, fieldName, id) => {
      switch (code) {
        case 'invalidJson':
          return 'Could not parse the JSON file.'
        case 'invalidProjectDocument':
          return 'The project JSON document is invalid.'
        case 'unsupportedProjectFormat':
          return 'This file is not a ChordCanvas project JSON.'
        case 'unsupportedProjectVersion':
          return 'This project version is not supported.'
        case 'invalidProjectState':
          return 'The project state is invalid.'
        case 'layoutRowsRequired':
          return 'layoutRows must contain at least one entry.'
        case 'invalidStockChords':
          return 'stockChords is invalid.'
        case 'blocksRequired':
          return 'blocks must contain at least one entry.'
        case 'missingSelectedBlock':
          return 'selectedBlockId does not reference an existing block.'
        case 'missingSelectedLayoutRow':
          return 'selectedLayoutRowId does not reference an existing row.'
        case 'duplicateLayoutRowId':
          return `layoutRows contains a duplicate id${id ? ` (${id})` : ''}.`
        case 'duplicateStockChordId':
          return `stockChords contains a duplicate id${id ? ` (${id})` : ''}.`
        case 'duplicateBlockId':
          return `blocks contains a duplicate id${id ? ` (${id})` : ''}.`
        case 'missingBlockRow':
          return `${fieldName ?? 'rowId'} references a rowId that does not exist.`
        case 'invalidField':
          return `${fieldName ?? 'field'} is invalid.`
      }
    },
    importFailed: (message) => `Import failed: ${message}`,
  },
}

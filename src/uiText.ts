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
  generatorHeading: string
  rootNote: string
  chordQuality: string
  chordForm: string
  addCurrentChord: string
  alreadyStockedButton: string
  addToStock: string
  editorHeading: string
  editingLayoutBlock: string
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
  addToRow: string
  delete: string
  removeStockChordAria: (name: string) => string
  stockEmpty: string
  layoutHeading: string
  openLayoutAddModal: string
  addRow: string
  removeLayoutRowAria: string
  lyricsLineLabel: (index: number) => string
  lyricsPlaceholder: string
  editSelectedChord: string
  finishEditingSelectedChord: string
  duplicateSelectedChord: string
  removeLayoutChordAria: (name: string) => string
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
  pdfExportFailed: (message: string) => string
  unknownError: string
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
    generatorHeading: 'コード選択',
    rootNote: 'ルート',
    chordQuality: 'コード種別',
    chordForm: '候補フォーム',
    addCurrentChord: 'コードを追加',
    alreadyStockedButton: 'このコードはストック済み',
    addToStock: 'ストックに追加',
    editorHeading: 'コードダイアグラム',
    editingLayoutBlock: 'レイアウト上のコードを編集中',
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
    addToRow: '追加',
    delete: '削除',
    removeStockChordAria: (name) => `${name} をストックから削除`,
    stockEmpty: 'ストックはまだ空です。繰り返し使うコードを追加できます。',
    layoutHeading: 'コード譜編集',
    openLayoutAddModal: 'コードを追加',
    addRow: '行を追加',
    removeLayoutRowAria: '行を削除',
    lyricsLineLabel: (index) => `歌詞 ${index + 1} 行`,
    lyricsPlaceholder: '歌詞を入力。スペースで位置を調整。',
    editSelectedChord: '編集',
    finishEditingSelectedChord: '編集を終了',
    duplicateSelectedChord: '複製',
    removeLayoutChordAria: (name) => `${name} をレイアウトから削除`,
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
    pdfExportFailed: (message) => `PDF 出力に失敗しました: ${message}`,
    unknownError: '不明なエラー',
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
    generatorHeading: 'Chord Selection',
    rootNote: 'Root',
    chordQuality: 'Chord Quality',
    chordForm: 'Chord Shape',
    addCurrentChord: 'Add Current Chord',
    alreadyStockedButton: 'Already in Stock',
    addToStock: 'Add to Stock',
    editorHeading: 'Chord Diagram',
    editingLayoutBlock: 'Editing Layout Block',
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
    addToRow: 'Add',
    delete: 'Delete',
    removeStockChordAria: (name) => `Remove ${name} from stock`,
    stockEmpty: 'Chord stock is empty. Add chords to reuse.',
    layoutHeading: 'Chord Chart Editor',
    openLayoutAddModal: 'Add chord',
    addRow: 'Add Row',
    removeLayoutRowAria: 'Delete row',
    lyricsLineLabel: (index) => `Lyrics line ${index + 1}`,
    lyricsPlaceholder: 'Enter lyrics. Use spaces to adjust alignment.',
    editSelectedChord: 'Edit',
    finishEditingSelectedChord: 'Stop Editing',
    duplicateSelectedChord: 'Duplicate',
    removeLayoutChordAria: (name) => `Remove ${name} from layout`,
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
    pdfExportFailed: (message) => `PDF export failed: ${message}`,
    unknownError: 'Unknown error',
    importFailed: (message) => `Import failed: ${message}`,
  },
}

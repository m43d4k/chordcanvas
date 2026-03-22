export type Locale = 'ja' | 'en'

interface UiText {
  languageToggleGroupLabel: string
  languageJa: string
  languageEn: string
  exportPdf: string
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
  addToSelectedRow: string
  delete: string
  stockEmpty: string
  layoutHeading: string
  addRow: string
  deleteSelectedRow: string
  lyricsLineLabel: (index: number) => string
  lyricsPlaceholder: string
  editSelectedChord: string
  finishEditingSelectedChord: string
  duplicateSelectedChord: string
  deleteSelectedChord: string
  moveLeft: string
  moveRight: string
  selectedChordRow: string
  horizontalOffset: string
  spacingAfter: string
  layoutRowLabel: (index: number) => string
  setInsertionTargetAria: (rowLabel: string) => string
  alreadyStockedFeedback: (name: string) => string
  addedToStockFeedback: (name: string) => string
  removedFromStockFeedback: (name: string) => string
  projectExportedFeedback: (fileName: string) => string
  pdfExportFailedMissingStage: string
  pdfExportedFeedback: (fileName: string) => string
  pdfExportFailed: (message: string) => string
  unknownError: string
  projectImportedFeedback: (fileName: string) => string
  importFailed: (message: string) => string
}

export const UI_TEXT: Record<Locale, UiText> = {
  ja: {
    languageToggleGroupLabel: '言語切り替え',
    languageJa: '日本語',
    languageEn: 'English',
    exportPdf: 'レイアウトを PDF 出力',
    exportingPdf: 'PDF を書き出し中...',
    exportProject: 'プロジェクトを書き出し',
    importProject: 'プロジェクトを読み込む',
    generatorHeading: 'コード生成',
    rootNote: 'ルート音',
    chordQuality: 'コード種別',
    chordForm: '候補フォーム',
    addCurrentChord: 'コードを追加',
    alreadyStockedButton: 'このコードはストック済み',
    addToStock: 'ストックに追加',
    editorHeading: 'コードダイアグラム編集',
    editingLayoutBlock: 'レイアウト上のコードを編集中',
    currentChord: '現在のコード',
    displayChordName: '表示コード名',
    useAutoDetectedName: '空欄なら自動判定名を使います。',
    editingBlockNotice: (name) => `${name} を編集中`,
    frettingInput: '押弦入力',
    autoAdjustViewport: '表示範囲を自動調整',
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
    playedNotes: '発音音',
    stockHeading: 'コードストック',
    addToSelectedRow: '選択中の行に追加',
    delete: '削除',
    stockEmpty:
      'ストックはまだ空です。繰り返し使うコードを追加できます。',
    layoutHeading: 'レイアウト編集',
    addRow: '行を追加',
    deleteSelectedRow: '選択行を削除',
    lyricsLineLabel: (index) => `歌詞 ${index + 1} 行`,
    lyricsPlaceholder: '歌詞を入力。スペースで位置を調整。',
    editSelectedChord: '編集',
    finishEditingSelectedChord: '編集を終了',
    duplicateSelectedChord: '複製',
    deleteSelectedChord: '削除',
    moveLeft: '左へ',
    moveRight: '右へ',
    selectedChordRow: '配置行',
    horizontalOffset: '水平オフセット(px)',
    spacingAfter: '後続との間隔(px)',
    layoutRowLabel: (index) => `${index + 1}行目`,
    setInsertionTargetAria: (rowLabel) => `${rowLabel} を追加先にする`,
    alreadyStockedFeedback: (name) => `${name} はすでにストック済みです。`,
    addedToStockFeedback: (name) => `${name} をストックに追加しました。`,
    removedFromStockFeedback: (name) =>
      `${name} をストックから削除しました。`,
    projectExportedFeedback: (fileName) => `${fileName} を書き出しました。`,
    pdfExportFailedMissingStage:
      'PDF 出力に失敗しました: レイアウト領域を取得できませんでした。',
    pdfExportedFeedback: (fileName) => `${fileName} を書き出しました。`,
    pdfExportFailed: (message) => `PDF 出力に失敗しました: ${message}`,
    unknownError: '不明なエラー',
    projectImportedFeedback: (fileName) =>
      `${fileName} を読み込みました。現在の project を置き換えています。`,
    importFailed: (message) => `インポートに失敗しました: ${message}`,
  },
  en: {
    languageToggleGroupLabel: 'Language switcher',
    languageJa: '日本語',
    languageEn: 'English',
    exportPdf: 'Export Layout PDF',
    exportingPdf: 'Exporting PDF...',
    exportProject: 'Export Project',
    importProject: 'Import Project',
    generatorHeading: 'Chord Generator',
    rootNote: 'Root Note',
    chordQuality: 'Chord Quality',
    chordForm: 'Chord Form',
    addCurrentChord: 'Add Current Chord',
    alreadyStockedButton: 'Already in Stock',
    addToStock: 'Add to Stock',
    editorHeading: 'Chord Diagram Editor',
    editingLayoutBlock: 'Editing Layout Block',
    currentChord: 'Current Chord',
    displayChordName: 'Display Chord Name',
    useAutoDetectedName: 'Leave it empty to use the detected name.',
    editingBlockNotice: (name) => `Editing ${name}`,
    frettingInput: 'Fretting Input',
    autoAdjustViewport: 'Auto-fit Viewport',
    startFret: 'Start Fret',
    visibleFretCount: 'Visible Frets',
    stringLabel: (stringNumber) => `Str ${stringNumber}`,
    stringMuteLabel: (stringNumber) => `Mute string ${stringNumber}`,
    stringOpenLabel: (stringNumber) => `Open string ${stringNumber}`,
    stringFretLabel: (stringNumber, fret) =>
      `String ${stringNumber}, fret ${fret}`,
    infoHeading: 'Chord Info',
    currentChordName: 'Current Chord Name',
    candidateChordNames: 'Candidate Names',
    noCandidates: 'No matches',
    bassNote: 'Bass Note',
    chordTones: 'Chord notes',
    uniqueNotes: 'Unique Notes',
    playedNotes: 'Played Notes',
    stockHeading: 'Chord Stock',
    addToSelectedRow: 'Add to Selected Row',
    delete: 'Delete',
    stockEmpty:
      'Chord stock is empty. Add chords you use repeatedly.',
    layoutHeading: 'Layout Editor',
    addRow: 'Add Row',
    deleteSelectedRow: 'Delete Selected Row',
    lyricsLineLabel: (index) => `Lyrics line ${index + 1}`,
    lyricsPlaceholder: 'Enter lyrics. Use spaces to adjust alignment.',
    editSelectedChord: 'Edit',
    finishEditingSelectedChord: 'Stop Editing',
    duplicateSelectedChord: 'Duplicate',
    deleteSelectedChord: 'Delete',
    moveLeft: 'Move Left',
    moveRight: 'Move Right',
    selectedChordRow: 'Row',
    horizontalOffset: 'Horizontal Offset (px)',
    spacingAfter: 'Spacing After (px)',
    layoutRowLabel: (index) => `Row ${index + 1}`,
    setInsertionTargetAria: (rowLabel) =>
      `Set ${rowLabel} as the insertion target`,
    alreadyStockedFeedback: (name) => `${name} is already in stock.`,
    addedToStockFeedback: (name) => `Added ${name} to stock.`,
    removedFromStockFeedback: (name) => `Removed ${name} from stock.`,
    projectExportedFeedback: (fileName) => `Exported ${fileName}.`,
    pdfExportFailedMissingStage:
      'PDF export failed: could not access the layout stage.',
    pdfExportedFeedback: (fileName) => `Exported ${fileName}.`,
    pdfExportFailed: (message) => `PDF export failed: ${message}`,
    unknownError: 'Unknown error',
    projectImportedFeedback: (fileName) =>
      `Imported ${fileName}. Replaced the current project.`,
    importFailed: (message) => `Import failed: ${message}`,
  },
}

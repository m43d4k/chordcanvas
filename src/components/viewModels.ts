import type { ChordSummary } from '../music/chords'
import type { StockChordState } from '../project/projectFile'

export interface StockEntryViewModel {
  displayName: string
  stockChord: StockChordState
  summary: ChordSummary
}

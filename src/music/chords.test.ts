import { describe, expect, it } from 'vitest'
import {
  detectChordCandidates,
  deriveBassNote,
  deriveUniqueNotes,
  deriveViewport,
  getChordForms,
  summarizeChord,
  toFretting,
} from './chords'

describe('music/chords', () => {
  it('derives notes and bass from a common open C shape', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])

    expect(deriveUniqueNotes(fretting)).toEqual(['C', 'E', 'G'])
    expect(deriveBassNote(fretting)).toBe('C')
  })

  it('calculates the correct high-position viewport', () => {
    const fretting = toFretting(['x', 6, 8, 6, 7, 6])

    expect(deriveViewport(fretting)).toEqual({
      startFret: 6,
      fretCount: 3,
      isNutPosition: false,
      visibleFrets: [6, 7, 8],
      editableFrets: [6, 7, 8, 9],
    })
  })

  it('keeps visible fret labels for low-position diagrams', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])

    expect(deriveViewport(fretting)).toMatchObject({
      startFret: 1,
      fretCount: 3,
      isNutPosition: true,
      visibleFrets: [1, 2, 3],
    })
  })

  it('detects slash chords without forcing the bass as root', () => {
    const fretting = toFretting([0, 3, 2, 0, 1, 0])

    expect(detectChordCandidates(fretting)[0]?.label).toBe('C/E')
  })

  it('detects extended and altered qualities from edited frettings', () => {
    const fretting = toFretting([0, 1, 0, 0, 'x', 'x'])

    expect(detectChordCandidates(fretting)[0]?.label).toBe('Em7b5')
  })

  it('returns open presets before movable forms when available', () => {
    const forms = getChordForms('C', 'major')

    expect(forms[0]?.label).toBe('Open C form')
    expect(
      summarizeChord(
        forms[0]?.fretting ?? toFretting(['x', 'x', 'x', 'x', 'x', 'x']),
      ).currentName,
    ).toBe('C')
  })
})

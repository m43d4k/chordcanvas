import { describe, expect, it } from 'vitest'
import {
  CHORD_QUALITIES,
  PITCH_CLASSES,
  detectChordCandidates,
  deriveBassNote,
  deriveNoteNameAtPosition,
  derivePlayableStringMidis,
  deriveStringDegreeLabels,
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

  it('derives per-string midi values while skipping muted strings', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])

    expect(derivePlayableStringMidis(fretting)).toEqual([48, 52, 55, 60, 64])
  })

  it('derives note names for a given string and fret position', () => {
    expect(deriveNoteNameAtPosition(5, 1)).toBe('F')
    expect(deriveNoteNameAtPosition(0, 3)).toBe('G')
    expect(deriveNoteNameAtPosition(99, 1)).toBeNull()
  })

  it('calculates the correct high-position viewport', () => {
    const fretting = toFretting(['x', 6, 8, 6, 7, 6])

    expect(deriveViewport(fretting)).toEqual({
      startFret: 6,
      fretCount: 5,
      isNutPosition: false,
      visibleFrets: [6, 7, 8, 9, 10],
      editableFrets: [6, 7, 8, 9, 10, 11],
    })
  })

  it('keeps a five-fret viewport for low-position diagrams', () => {
    const fretting = toFretting(['x', 3, 2, 0, 1, 0])

    expect(deriveViewport(fretting)).toMatchObject({
      startFret: 1,
      fretCount: 5,
      isNutPosition: true,
      visibleFrets: [1, 2, 3, 4, 5],
    })
  })

  it('uses a shifted five-fret viewport when the shape extends past the fourth fret', () => {
    const fretting = toFretting([4, 6, 6, 5, 4, 4])

    expect(deriveViewport(fretting)).toEqual({
      startFret: 4,
      fretCount: 5,
      isNutPosition: false,
      visibleFrets: [4, 5, 6, 7, 8],
      editableFrets: [4, 5, 6, 7, 8, 9],
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

  it('keeps exact matches ahead of candidates with permitted omissions', () => {
    const fretting = toFretting(['x', 3, 2, 3, 'x', 'x'])
    const candidates = detectChordCandidates(fretting)

    expect(candidates[0]).toMatchObject({
      label: 'C7',
      matchKind: 'omission',
      omittedIntervals: [7],
    })
  })

  it('separates rootless interpretations from the regular candidates', () => {
    const summary = summarizeChord(toFretting([0, 1, 0, 'x', 'x', 'x']))

    expect(
      summary.candidates.map((candidate) => candidate.label),
    ).not.toContain('C9/E')
    expect(summary.inferredCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'C9/E',
          matchKind: 'inferred',
        }),
      ]),
    )
  })

  it.each([
    ['madd9', 'Emadd9'],
    ['mMaj7', 'EmMaj7'],
    ['6/9', 'E6/9'],
    ['9', 'E9'],
    ['11', 'E11'],
    ['13', 'E13'],
    ['m11', 'Em11'],
    ['7b5', 'E7b5'],
    ['7#5', 'E7#5'],
    ['7b9', 'E7b9'],
    ['7#9', 'E7#9'],
  ] as const)('provides a recognizable %s form', (quality, expectedLabel) => {
    const form = getChordForms('E', quality)[0]

    expect(form).toBeDefined()
    expect(
      detectChordCandidates(
        form?.fretting ?? toFretting(['x', 'x', 'x', 'x', 'x', 'x']),
      ).map((candidate) => candidate.label),
    ).toContain(expectedLabel)
  })

  it('derives degree labels for fretted notes from the detected chord', () => {
    const fretting = toFretting([0, 2, 2, 1, 0, 0])

    expect(deriveStringDegreeLabels(fretting)).toEqual([
      null,
      '5',
      'R',
      '3',
      null,
      null,
    ])
  })

  it('keeps extended degrees like 9 in marker labels', () => {
    const fretting = toFretting([0, 2, 2, 1, 0, 2])

    expect(summarizeChord(fretting).stringDegreeLabels).toEqual([
      null,
      '5',
      'R',
      '3',
      null,
      '9',
    ])
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

  it('provides multiple recognizable forms for every root and quality', () => {
    for (const root of PITCH_CLASSES) {
      for (const quality of CHORD_QUALITIES) {
        const forms = getChordForms(root, quality)

        expect(forms.length, `${root} ${quality}`).toBeGreaterThanOrEqual(3)
        expect(new Set(forms.map((form) => form.fretting.join('-'))).size).toBe(
          forms.length,
        )

        for (const form of forms) {
          expect(
            detectChordCandidates(form.fretting).some(
              (candidate) =>
                candidate.root === root && candidate.quality === quality,
            ),
            `${root} ${quality}: ${form.label}`,
          ).toBe(true)
        }
      }
    }
  })

  it('offers several E diminished positions instead of a single preset', () => {
    const forms = getChordForms('E', 'dim')

    expect(forms.length).toBeGreaterThanOrEqual(3)
    expect(forms.map((form) => form.label)).toEqual(
      expect.arrayContaining([
        'Diminished triad form',
        expect.stringContaining('Compact form'),
      ]),
    )
  })
})

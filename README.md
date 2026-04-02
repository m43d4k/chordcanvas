# chordcanvas

[English](./README.md) | [日本語](./README-ja.md)

`chordcanvas` is a browser-based local guitar chord diagram / chord chart editor. It handles chord generation, fretting edits, lyric-line placement, project save/load, and PDF export entirely on the frontend.

## Current status

- Frontend app built with Vite + React + TypeScript
- No backend, database, or Python
- Uses Node.js 22 via `mise.toml`
- Targets standard-tuning 6-string guitar only
- `npm run build` outputs to `dist/`

## Current features

- Generate chords from a root note, chord quality, and available forms
- Supports `major` `minor` `5` `sus2` `sus4` `dim` `aug` `6` `m6` `7` `maj7` `m7` `m7b5` `dim7` `add9` `maj9` `m9` `7sus4`
- Edit fretting directly in the chord builder modal and manually adjust the start fret and visible fret count
- Review auto-fit viewport results, candidate chord names, bass note, chord tones, unique notes, and per-string notes
- Show degree labels such as `R` `b3` `3` `5` `b7` `7` and `9` inside fretted markers
- Override displayed names individually for the current chord, layout chords, and stocked chords
- Reuse stocked chord voicings, prevent duplicate registrations for identical fretting, and remove unused stock entries
- Open the stock chord modal from the stock `+` button
- Open the chord add modal from each layout row `+` button and add a chord to that row
- Add existing stocked chords directly from the layout add modal
- Select layout chord blocks to edit, duplicate, move left or right within the row, or delete
- Drag chord blocks horizontally to adjust position while updating trailing spacing for following blocks
- Add multiple lyric rows, edit lyrics in place, and remove unused rows
- Preserve lyric spacing in PDF export
- Switch the visible UI language between Japanese and English from the header
- Export and import project JSON, with import validating format, version, and state
- Export two PDF variants: A4 portrait multi-page and tall single-page

## Setup

1. `mise install`
2. `npm install`
3. `npm run dev`
4. Open the local URL shown by Vite in your browser

## Available scripts

- `npm run dev`: Start the Vite development server
- `npm run build`: Build TypeScript and the app, then write output to `dist/`
- `npm run lint`: Run ESLint
- `npm run test`: Run Vitest
- `npm run typecheck`: Run TypeScript checks for both app and Node configs
- `npm run format`: Format with Prettier
- `npm run format:check`: Check formatting with Prettier

## Output files

- Project export file: `chordcanvas-project.json`
- Print PDF: `chordcanvas-layout.pdf`
- Tall screen PDF: `chordcanvas-layout-long.pdf`

## Testing and quality

- Tests use Vitest + Testing Library
- Linting uses ESLint and formatting uses Prettier

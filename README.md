# chordcanvas

Guitar chord diagram editor for creating, editing, arranging, and PDF-exporting chord layouts locally.

## Current features

- Generate chord forms from root note and chord quality selections
- Edit fretting directly from a unified chord diagram editor
- Keep the chord diagram editor focused on the current chord, and only apply edits to an existing layout block after explicitly enabling block editing
- Override the displayed chord name for the current chord, layout blocks, and stocked chords when needed
- Show chord-tone degrees such as `R`, `3`, `5`, `7`, and `9` inside fretted markers
- Arrange chord blocks across multiple lyric rows
- Adjust per-block horizontal offset and trailing spacing without overlapping later blocks
- Save reusable chord voicings in a project stock and add them back to the selected row
- Export and import project JSON, and export layout PDF

## Setup

1. Install the pinned Node.js version with `mise install`
2. Install dependencies with `npm install`
3. Start the dev server with `npm run dev`

## Available scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run format`
- `npm run format:check`

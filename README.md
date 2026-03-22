# chordcanvas

Guitar chord diagram editor for creating, editing, arranging, and PDF-exporting chord layouts locally.

## Current features

- Open a chord builder modal from the stock `+` button and add the current chord to stock
- Open the same chord builder modal from each layout row `+` button and add a generated chord block to that row
- Use the shared chord builder modal for chord generation, direct fretting edits, and chord information review
- Switch the visible UI language between Japanese and English from the header
- Reopen the chord builder as a block edit modal when updating an existing layout chord
- Override the displayed chord name for the current chord, layout blocks, and stocked chords when needed
- Show chord-tone degrees such as `R`, `3`, `5`, `7`, and `9` inside fretted markers
- Arrange chord blocks across multiple lyric rows
- Edit lyric rows in place on the layout while preserving spacing in PDF export
- Adjust per-block horizontal offset and trailing spacing, and drag chord blocks horizontally while pushing later blocks out of the way
- Save reusable chord voicings in a project stock and add them back to the selected row, including from the layout add modal
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

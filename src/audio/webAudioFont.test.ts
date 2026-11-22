import { afterEach, expect, it, vi } from 'vitest'
import { toFretting } from '../music/chords'
import { toVersionedAssetUrl } from '../utils/versionedAsset'
import { playChordFretting, stopChordPlayback } from './webAudioFont'

afterEach(() => {
  vi.unstubAllGlobals()
  for (const script of document.querySelectorAll(
    'script[data-webaudiofont-src]',
  )) {
    script.remove()
  }
})

it('cancels a chord waiting for the audio context to resume', async () => {
  let finishResume!: () => void
  const resumePending = new Promise<void>((resolve) => {
    finishResume = resolve
  })
  const context = {
    state: 'suspended',
    resume: vi.fn(() => resumePending),
  }
  const queueStrumDown = vi.fn()
  const cancelQueue = vi.fn()

  vi.stubGlobal('AudioContext', function AudioContextMock() {
    return context
  })
  vi.stubGlobal('WebAudioFontPlayer', function WebAudioFontPlayerMock() {
    return {
      cancelQueue,
      loader: {
        decodeAfterLoading: vi.fn(),
        waitLoad: (onFinish: () => void) => onFinish(),
      },
      queueStrumDown,
    }
  })
  vi.stubGlobal('_tone_0253_Acoustic_Guitar_sf2_file', { zones: [] })

  for (const file of [
    'WebAudioFontPlayer.js',
    '0253_Acoustic_Guitar_sf2_file.js',
  ]) {
    const script = document.createElement('script')
    script.dataset.webaudiofontSrc = toVersionedAssetUrl(
      `${import.meta.env.BASE_URL}webaudiofont/${file}`,
    )
    script.dataset.loaded = 'true'
    document.head.appendChild(script)
  }

  const fretting = toFretting([0, 2, 2, 1, 0, 0])
  const pendingPlayback = playChordFretting(fretting)
  await vi.waitFor(() => expect(context.resume).toHaveBeenCalledOnce())

  await stopChordPlayback()
  expect(cancelQueue).toHaveBeenCalledWith(context)
  context.state = 'running'
  finishResume()

  expect(await pendingPlayback).toBe(false)
  expect(queueStrumDown).not.toHaveBeenCalled()
  expect(await playChordFretting(fretting)).toBe(true)
  expect(queueStrumDown).toHaveBeenCalledOnce()
})

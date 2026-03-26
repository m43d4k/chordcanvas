import type { Fretting } from '../music/chords'
import { derivePlayableStringMidis } from '../music/chords'
import { toVersionedAssetUrl } from '../utils/versionedAsset'

const PLAYER_SCRIPT_PATH = toVersionedAssetUrl(
  `${import.meta.env.BASE_URL}webaudiofont/WebAudioFontPlayer.js`,
)
const PRESET_SCRIPT_PATH = toVersionedAssetUrl(
  `${import.meta.env.BASE_URL}webaudiofont/0253_Acoustic_Guitar_sf2_file.js`,
)
const PRESET_VARIABLE = '_tone_0253_Acoustic_Guitar_sf2_file'
const DEFAULT_STRUM_DURATION_SECONDS = 1.6
const DEFAULT_VOLUME = 0.8

interface AudioFontPreset {
  zones: Array<Record<string, unknown>>
}

interface WebAudioFontPlayerLike {
  cancelQueue: (audioContext: AudioContext) => void
  loader: {
    decodeAfterLoading: (
      audioContext: AudioContext,
      variableName: string,
    ) => void
    waitLoad: (onFinish: () => void) => void
  }
  queueStrumDown: (
    audioContext: AudioContext,
    target: AudioNode,
    preset: AudioFontPreset,
    when: number,
    pitches: number[],
    duration: number,
    volume?: number,
  ) => unknown
}

interface WebAudioFontPlayerConstructor {
  new (): WebAudioFontPlayerLike
}

interface PlaybackState {
  audioContext: AudioContext
  player: WebAudioFontPlayerLike
  preset: AudioFontPreset
}

declare global {
  interface Window {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
    WebAudioFontPlayer?: WebAudioFontPlayerConstructor
    _tone_0253_Acoustic_Guitar_sf2_file?: AudioFontPreset
  }
}

const scriptLoaders = new Map<string, Promise<void>>()
let playbackStatePromise: Promise<PlaybackState> | null = null

function loadScript(src: string): Promise<void> {
  const existingPromise = scriptLoaders.get(src)

  if (existingPromise) {
    return existingPromise
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-webaudiofont-src="${src}"]`,
    )

    if (existingScript?.dataset.loaded === 'true') {
      resolve()
      return
    }

    const script = existingScript ?? document.createElement('script')

    script.async = true
    script.dataset.webaudiofontSrc = src
    script.src = src
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    })
    script.addEventListener('error', () => {
      reject(new Error(`Failed to load audio asset: ${src}`))
    })

    if (!existingScript) {
      document.head.appendChild(script)
    }
  })

  scriptLoaders.set(src, promise)

  return promise
}

function waitForPresetDecode(player: WebAudioFontPlayerLike): Promise<void> {
  return new Promise((resolve) => {
    player.loader.waitLoad(resolve)
  })
}

async function createPlaybackState(): Promise<PlaybackState> {
  const AudioContextConstructor =
    window.AudioContext ?? window.webkitAudioContext

  if (!AudioContextConstructor) {
    throw new Error('Web Audio API is not available in this browser.')
  }

  await loadScript(PLAYER_SCRIPT_PATH)
  await loadScript(PRESET_SCRIPT_PATH)

  const PlayerConstructor = window.WebAudioFontPlayer
  const preset = window[PRESET_VARIABLE]

  if (!PlayerConstructor || !preset) {
    throw new Error('WebAudioFont failed to initialize.')
  }

  const audioContext = new AudioContextConstructor()
  const player = new PlayerConstructor()

  player.loader.decodeAfterLoading(audioContext, PRESET_VARIABLE)
  await waitForPresetDecode(player)

  return {
    audioContext,
    player,
    preset,
  }
}

async function getPlaybackState(): Promise<PlaybackState> {
  if (!playbackStatePromise) {
    playbackStatePromise = createPlaybackState().catch((error) => {
      playbackStatePromise = null
      throw error
    })
  }

  return playbackStatePromise
}

export async function playChordFretting(fretting: Fretting): Promise<boolean> {
  const pitches = derivePlayableStringMidis(fretting)

  if (pitches.length === 0) {
    return false
  }

  const { audioContext, player, preset } = await getPlaybackState()

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  player.cancelQueue(audioContext)
  player.queueStrumDown(
    audioContext,
    audioContext.destination,
    preset,
    audioContext.currentTime + 0.01,
    [...pitches],
    DEFAULT_STRUM_DURATION_SECONDS,
    DEFAULT_VOLUME,
  )

  return true
}

import type { UiText } from '../uiText'

interface AudioMuteButtonProps {
  isMuted: boolean
  onToggle: () => void
  text: UiText
}

function AudioMuteButton({ isMuted, onToggle, text }: AudioMuteButtonProps) {
  const label = isMuted ? text.unmuteAudio : text.muteAudio

  return (
    <button
      aria-label={label}
      className="panel-icon-button"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <svg
        aria-hidden="true"
        fill="none"
        focusable="false"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="20"
      >
        {isMuted ? (
          <path d="M5 9H3v6h3l5 5v-5M11 7V4L9.5 5.5M3 3l18 18" />
        ) : (
          <>
            <path d="M11 4 6 9H3v6h3l5 5Z" />
            <path d="M15 9a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12" />
          </>
        )}
      </svg>
    </button>
  )
}

export default AudioMuteButton

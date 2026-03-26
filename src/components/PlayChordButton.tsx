interface PlayChordButtonProps {
  ariaLabel: string
  className?: string
  onClick: () => void
}

function PlayChordButton({
  ariaLabel,
  className,
  onClick,
}: PlayChordButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={className ? `play-chord-button ${className}` : 'play-chord-button'}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      type="button"
    >
      <span aria-hidden="true" className="play-chord-button-icon">
        ▶
      </span>
    </button>
  )
}

export default PlayChordButton

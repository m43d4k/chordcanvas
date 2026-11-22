interface PlayChordButtonProps {
  ariaLabel: string
  className?: string
  disabled: boolean
  onClick: () => void
}

function PlayChordButton({
  ariaLabel,
  className,
  disabled,
  onClick,
}: PlayChordButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={
        className ? `play-chord-button ${className}` : 'play-chord-button'
      }
      disabled={disabled}
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

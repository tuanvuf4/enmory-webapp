import styles from './style.module.scss'
import classNames from 'clsx'

interface IProps {
  // callers should pass refs created by useRef, which are mutable but compatible with RefObject
  progressBarRef: React.RefObject<HTMLInputElement>
  audioRef: React.RefObject<HTMLAudioElement>
  timeProgress: number
  duration: number
}

export const ProgressBar: React.FC<IProps> = ({
  progressBarRef,
  audioRef,
  timeProgress,
  duration,
}) => {
  const handleProgressChange = () => {
    if (progressBarRef.current && audioRef.current)
      audioRef.current.currentTime = parseInt(progressBarRef.current.value)
  }

  const formatTime = (time: number) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60)
      const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`
      const seconds = Math.floor(time % 60)
      const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`
      return `${formatMinutes}:${formatSeconds}`
    }
    return '00:00'
  }

  return (
    <div className={styles.progress}>
      <span className={classNames(styles.time, 'current')}>{formatTime(timeProgress)}</span>

      <input type='range' ref={progressBarRef} defaultValue='0' onChange={handleProgressChange} />

      <span className={classNames(styles.time)}>{formatTime(duration)}</span>
    </div>
  )
}

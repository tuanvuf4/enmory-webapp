import { theme } from 'antd'
import { RefObject } from 'react'
import styles from './style'
import gStyles from 'src/style/appStyle'
import classNames from 'clsx'

interface IProps {
  progressBarRef: RefObject<HTMLInputElement>
  audioRef: RefObject<HTMLAudioElement>
  timeProgress: number
  duration: number
}

export const ProgressBar: React.FC<IProps> = ({
  progressBarRef,
  audioRef,
  timeProgress,
  duration,
}) => {
  const { token } = theme.useToken()
  const classes = styles(token)

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
    <div className={classes.progress}>
      <span className={classNames(classes.time, 'current')}>{formatTime(timeProgress)}</span>

      <input type='range' ref={progressBarRef} defaultValue='0' onChange={handleProgressChange} />

      <span className={classNames(classes.time)}>{formatTime(duration)}</span>
    </div>
  )
}

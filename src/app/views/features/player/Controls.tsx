import {
  StepBackwardOutlined,
  BackwardOutlined,
  PauseOutlined,
  CaretRightOutlined,
  ForwardOutlined,
  StepForwardOutlined,
  NotificationOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { ITracks } from '@/models/media.model'
import { RefObject, useState, useRef, useCallback, useEffect } from 'react'
import styles from "./style.module.scss"

interface IProps {
  audioRef: RefObject<HTMLAudioElement>
  progressBarRef: RefObject<HTMLInputElement>
  duration: number
  tracks: ITracks[]
  current: number
  isPlaying: boolean
  setIsPlaying: (value: boolean) => void
  setTimeProgress: (index: number) => void
  setTrackIndex: (index: number) => void
  setCurrentTrack: (track: ITracks) => void
  handleNext: () => void
}

export const Controls: React.FC<IProps> = ({
  audioRef,
  progressBarRef,
  duration,
  tracks,
  current,
  isPlaying,
  setIsPlaying,
  setTimeProgress,
  setTrackIndex,
  setCurrentTrack,
  handleNext,
}) => {
  

  const [volume] = useState(100)
  const [muteVolume, setMuteVolume] = useState(false)

  const togglePlayPause = () => {
    setIsPlaying(isPlaying ? false : true)
  }

  const playAnimationRef = useRef<unknown>()

  const repeat = useCallback(() => {
    const currentTime = audioRef.current?.currentTime

    setTimeProgress(currentTime as number)

    if (currentTime && progressBarRef.current) {
      progressBarRef.current.value = currentTime.toString()
      progressBarRef.current.style.setProperty(
        '--range-progress',
        `${(parseInt(progressBarRef.current.value) / duration) * 100}%`,
      )
    }

    playAnimationRef.current = requestAnimationFrame(repeat)
  }, [audioRef, duration, progressBarRef, setTimeProgress])

  const skipForward = () => {
    if (audioRef && audioRef.current) audioRef.current.currentTime += 10
  }

  const skipBackward = () => {
    if (audioRef && audioRef.current) audioRef.current.currentTime -= 10
  }

  const handlePrevious = () => {
    if (current === 0) {
      const lastTrackIndex = tracks.length - 1
      setTrackIndex(lastTrackIndex)
      setCurrentTrack(tracks[lastTrackIndex])
    } else {
      setTrackIndex(current - 1)
      setCurrentTrack(tracks[current - 1])
    }
  }

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current?.play()
    } else {
      audioRef.current?.pause()
    }
    playAnimationRef.current = requestAnimationFrame(repeat)
  }, [isPlaying, audioRef, repeat])

  useEffect(() => {
    if (audioRef && audioRef.current) {
      audioRef.current.volume = volume / 100
      audioRef.current.muted = muteVolume
    }
  }, [volume, audioRef, muteVolume])

  return (
    <div className={styles.controlsWrapper}>
      <div className={styles.controlOptions}></div>

      <div className={styles.controls}>
        <button onClick={handlePrevious}>
          <StepBackwardOutlined style={{ fontSize: 24 }} />
        </button>

        <button onClick={skipBackward}>
          <BackwardOutlined style={{ fontSize: 24 }} />
        </button>

        <button onClick={togglePlayPause}>
          {isPlaying ? (
            <PauseOutlined style={{ fontSize: 24 }} />
          ) : (
            <CaretRightOutlined style={{ fontSize: 24 }} />
          )}
        </button>

        <button onClick={skipForward}>
          <ForwardOutlined style={{ fontSize: 24 }} />
        </button>

        <button onClick={handleNext}>
          <StepForwardOutlined style={{ fontSize: 24 }} />
        </button>
      </div>

      <div className={styles.volume}>
        <button onClick={() => setMuteVolume((prev) => !prev)}>
          {muteVolume || volume < 5 ? (
            <NotificationOutlined style={{ fontSize: 24 }} />
          ) : volume < 40 ? (
            <SoundOutlined style={{ fontSize: 24 }} />
          ) : (
            <SoundOutlined style={{ fontSize: 24 }} />
          )}
        </button>

        {/* Show volume bar */}
        {/* <input
          type='range'
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          style={{
            background: `linear-gradient(to right, ${styleConfig.color.yellow[6]} ${volume}%, #ccc ${volume}%)`,
          }}
        /> */}
      </div>
    </div>
  )
}

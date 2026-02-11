import { CustomerServiceOutlined } from '@ant-design/icons'
import { RefObject } from 'react'
import styles from "./style.module.scss"
import { ITrack } from './data'

interface IProps {
  currentTrack: ITrack
  audioRef: RefObject<HTMLAudioElement>
  progressBarRef: RefObject<HTMLInputElement>
  setDuration: (duration: number) => void
  handleNext: () => void
}

export const Track: React.FC<IProps> = ({
  currentTrack,
  audioRef,
  setDuration,
  progressBarRef,
  handleNext,
}) => {
  

  const onLoadedMetadata = () => {
    const seconds = audioRef.current?.duration
    setDuration(seconds as number)
    if (progressBarRef.current) progressBarRef.current.max = seconds?.toString() as string
  }

  return (
    <div>
      <audio
        src={currentTrack.src}
        ref={audioRef}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={handleNext}
      />

      <div className={styles.audioInfo}>
        <div className={styles.audioImage}>
          <div className={styles.iconWrapper}>
            <span className={styles.audioIcon}>
              <CustomerServiceOutlined />
            </span>
          </div>
        </div>

        <div className={styles.audioDetail}>
          <p className={styles.title}>{currentTrack.title}</p>
          <p className={styles.author}>{currentTrack.author}</p>
          <p className={styles.description}>{currentTrack.author}</p>
        </div>
      </div>
    </div>
  )
}

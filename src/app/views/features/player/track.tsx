import { CustomerServiceOutlined } from '@ant-design/icons'
import { RefObject } from 'react'
import { theme } from 'antd'
import styles from './style'
import gStyles from 'src/style/appStyle'
import { ITrack } from './data/tracks'

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
  const { token } = theme.useToken()

  const classes = styles(token)

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

      <div className={classes.audioInfo}>
        <div className={classes.audioImage}>
          <div className={classes.iconWrapper}>
            <span className={classes.audioIcon}>
              <CustomerServiceOutlined />
            </span>
          </div>
        </div>

        <div className={classes.audioDetail}>
          <p className={classes.title}>{currentTrack.title}</p>
          <p className={classes.author}>{currentTrack.author}</p>
          <p className={classes.description}>{currentTrack.author}</p>
        </div>
      </div>
    </div>
  )
}

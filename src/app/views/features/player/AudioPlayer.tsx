import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Controls } from './Controls'
import { ProgressBar } from './ProgressBar'
import { Button, Dropdown, MenuProps, theme } from 'antd'
import styles from './style'
import { appStyleConfig } from '@/style/appStyle'
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  EditOutlined,
  MenuOutlined,
  PauseOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { ITracks } from '@/models/media.model'
import { EMediaSrc } from '@/models/dictation.model'
import { setting } from '@/config/appConfig'
import classNames from 'clsx'
import { TExternalSource } from '../modals/MediaUploadModal'

interface IProps {
  tracks: ITracks[]
  current: number
  isPlaying: boolean
  mediaSrc: EMediaSrc
  setIsPlaying: (value: boolean) => void
  onAdd: () => void
  onSrcChange: (e: EMediaSrc) => void
  setTrackIndex: (index: number) => void
  onDelete: (id: number) => void
  onCurrentUpdating: (id: number) => void
}

export const AudioPlayer: React.FC<IProps> = ({
  tracks,
  current,
  isPlaying,
  mediaSrc,
  setIsPlaying,
  setTrackIndex,
  onAdd,
  onSrcChange,
  onDelete,
  onCurrentUpdating,
}) => {
  const { token } = theme.useToken()
  const classes = styles()

  const [currentTrack, setCurrentTrack] = useState<ITracks | null>(null)
  const [timeProgress, setTimeProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [sticky, setSticky] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressBarRef = useRef<HTMLInputElement>(null)

  const handleNext = () => {
    if (current >= tracks.length - 1) {
      setTrackIndex(0)
    } else {
      setTrackIndex(current + 1)
    }
  }

  const onLoadedMetadata = () => {
    const seconds = audioRef.current?.duration
    setDuration(seconds as number)
    if (progressBarRef.current) progressBarRef.current.max = seconds?.toString() as string
  }

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: <span style={{ fontSize: 14 }}>Interal</span>,
      onClick: (e) => {
        e.domEvent.preventDefault()
        onSrcChange(EMediaSrc.INTERNAL)
      },
    },
    {
      key: '2',
      label: <span style={{ fontSize: 14 }}>External</span>,
      onClick: (e) => {
        e.domEvent.preventDefault()
        onSrcChange(EMediaSrc.EXTERNAL)
      },
    },
  ]

  const stickyControls = () => {
    const player = document.querySelector('#audioPlayer')?.getBoundingClientRect()

    if (window.outerWidth <= 650 && player && ((player?.height + player?.top) as number) < 200) {
      setSticky(true)
    } else setSticky(false)
  }

  useEffect(() => {
    if (tracks.length > 0 && current >= 0) {
      setCurrentTrack(tracks[current])
    }
  }, [tracks, current])

  useEffect(() => {
    isPlaying ? audioRef.current?.play() : audioRef.current?.pause()
  }, [isPlaying])

  useLayoutEffect(() => {
    window.addEventListener('resize', stickyControls)
    window.addEventListener('scroll', stickyControls)

    return () => {
      window.removeEventListener('resize', stickyControls)
      window.removeEventListener('scroll', stickyControls)
    }
  }, [])

  return (
    <div className={classes.audioPlayer} id={'audioPlayer'}>
      <div className={classes.player}>
        {mediaSrc === EMediaSrc.INTERNAL && currentTrack && (
          <>
            <div className={classes.audioInfo}>
              {current > -1 && tracks.length > 0 && (
                <>
                  <p className={classes.title}>{currentTrack.title}</p>
                  {/* <p className={classes.author}>
                    {currentTrack.user.firstName +
                      ' ' +
                      currentTrack.user.lastName}
                  </p>
                  <p className={classes.description}>
                    {currentTrack.description}
                  </p> */}
                </>
              )}
            </div>

            <div className={classes.audioImage}>
              {current > -1 && tracks.length > 0 && (
                <audio
                  src={currentTrack.internalUrl}
                  ref={audioRef}
                  onLoadedMetadata={onLoadedMetadata}
                  onEnded={handleNext}
                />
              )}

              <div className={classes.iconWrapper}>
                <span className={classes.audioIcon}>
                  <CustomerServiceOutlined />
                </span>
              </div>
            </div>

            <div className={classNames(classes.controlAction, sticky ? classes.sticky : '')}>
              {tracks.length > 0 && current > -1 && (
                <>
                  <Controls
                    {...{
                      audioRef,
                      progressBarRef,
                      duration,
                      setTimeProgress,
                      tracks,
                      current,
                      setTrackIndex,
                      setCurrentTrack,
                      handleNext,
                      isPlaying,
                      setIsPlaying,
                    }}
                  />

                  <ProgressBar {...{ progressBarRef, audioRef, timeProgress, duration }} />
                </>
              )}
            </div>
          </>
        )}

        {mediaSrc === EMediaSrc.EXTERNAL && currentTrack?.externalUrl && (
          <>
            {currentTrack.externalSource === TExternalSource.IFRAME && (
              <div
                className={classes.iframeExtSrc}
                dangerouslySetInnerHTML={{ __html: currentTrack?.externalUrl }}
              />
            )}
            {currentTrack.externalSource === TExternalSource.EMBED && (
              <div className={classes.iframeExtSrc}>
                <iframe src={currentTrack?.externalUrl} frameBorder='0'></iframe>
              </div>
            )}
          </>
        )}
      </div>

      <div className={classes.tracks}>
        <div className={classes.tracksTitle}>
          <h2>
            <Dropdown menu={{ items }} trigger={['click']} placement='bottomLeft' arrow>
              <Button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: token.colorWhite,
                  padding: `${token.size / 2}px 0`,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                <CaretDownOutlined /> {mediaSrc}
                {mediaSrc === EMediaSrc.INTERNAL && (
                  <span className={classes.quantity}>
                    ({tracks.filter((track) => track.internalUrl).length})
                  </span>
                )}
                {mediaSrc === EMediaSrc.EXTERNAL && (
                  <span className={classes.quantity}>
                    ({tracks.filter((track) => track.externalUrl).length})
                  </span>
                )}
              </Button>
            </Dropdown>
          </h2>

          {tracks.length <= setting.listening.maxMediaItem && mediaSrc === EMediaSrc.INTERNAL && (
            <Button
              style={{
                background: 'transparent',
                color: token.colorWhite,
                border: 'none',
              }}
              icon={<PlusOutlined />}
              onClick={onAdd}
            />
          )}

          {tracks.length <= setting.listening.maxMediaItem * 4 &&
            mediaSrc === EMediaSrc.EXTERNAL && (
              <Button
                style={{
                  background: 'transparent',
                  color: token.colorWhite,
                  border: 'none',
                }}
                icon={<PlusOutlined />}
                onClick={onAdd}
              />
            )}
        </div>

        <div className={classes.tracksContent}>
          <ul>
            {tracks.map((track, key) => (
              <li className={key === current ? classes.active : ''} key={key}>
                {mediaSrc === EMediaSrc.INTERNAL && (
                  <div>
                    <Button
                      size='small'
                      style={{
                        background: 'transparent',
                        color: token.colorWhite,
                        border: 'none',
                      }}
                      onClick={() => {
                        setTrackIndex(key)
                        if (mediaSrc === EMediaSrc.INTERNAL)
                          setIsPlaying(isPlaying && key === current ? false : true)
                      }}
                    >
                      {key === current && !isPlaying && <CaretRightOutlined />}
                      {key === current && isPlaying && <PauseOutlined />}
                      {key !== current && <CaretRightOutlined />}
                    </Button>
                  </div>
                )}

                {mediaSrc === EMediaSrc.EXTERNAL && (
                  <div>
                    <Button
                      size='small'
                      style={{
                        background: 'transparent',
                        color: token.colorWhite,
                        border: 'none',
                      }}
                    >
                      <MenuOutlined />
                    </Button>
                  </div>
                )}

                <div style={{ flex: '1 0', userSelect: 'none' }}>
                  <h4
                    className={classes.trackTitle}
                    onClick={() => {
                      setTrackIndex(key)
                      if (mediaSrc === EMediaSrc.INTERNAL)
                        setIsPlaying(isPlaying && key === current ? false : true)
                    }}
                  >
                    {track.title}
                  </h4>
                  {/* <span className={classes.trackAuthor}>
                    {track.user.firstName + ' ' + track.user.lastName}
                  </span> */}
                </div>

                <div className={classes.actionGroup}>
                  <Button
                    size='small'
                    type='text'
                    style={{
                      background: 'transparent',
                      color: appStyleConfig.color.yellow[4],
                    }}
                    onClick={() => onCurrentUpdating(track.id as number)}
                  >
                    <EditOutlined />
                  </Button>

                  <Button
                    size='small'
                    type='text'
                    danger
                    style={{ background: 'transparent' }}
                    onClick={() => onDelete(track.id as number)}
                  >
                    <DeleteOutlined />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CloseOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  ReloadOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Flex } from 'antd'
import ReactPlayer from 'react-player'
import styles from './style.module.scss'
import { useDispatch, useSelector } from '@/core/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'
import { listeningAction } from '@/store/reducers/listening.reducer'

// ─── Player local state (mirrors official react-player example) ──────────────

const initialState = {
  src: undefined,
  pip: false,
  playing: false,
  controls: true,
  light: false,
  volume: 1,
  muted: false,
  played: 0,
  loaded: 0,
  duration: 0,
  playbackRate: 1.0,
  loop: false,
  seeking: false,
  loadedSeconds: 0,
  playedSeconds: 0,
}

type PlayerState = Omit<typeof initialState, 'src'> & {
  src?: string
}

// ─────────────────────────────────────────────────────────────────────────────

export const PlayerDock = () => {
  const playerRef = useRef<HTMLVideoElement | null>(null)

  const [trackListOpen, setTrackListOpen] = useState(false)

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)
  const { dockVisible } = useSelector((state) => state.setting)
  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  // Playback state (single object, setState(prev => ...) pattern)
  // const [state, setState] = useState<PlayerState>(initialState)

  const {
    src,
    playing,
    controls,
    light,
    volume,
    muted,
    loop,
    played,
    loaded,
    duration,
    playbackRate,
    pip,
  } = player

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    playerRef.current = player
  }, [])

  useEffect(() => {
    if (currentTrack) load(currentTrack.srcUrl)
  }, [currentTrack])

  const handlePlay = () => dispatch(listeningAction.updatePlayer({ playing: true }))
  const handlePause = () => dispatch(listeningAction.updatePlayer({ playing: false }))

  const load = (src?: string) => {
    dispatch(
      listeningAction.updatePlayer({
        ...player,
        src,
        played: 0,
        loaded: 0,
        pip: false,
      }),
    )
  }

  const handleDurationChange = () => {
    const player = playerRef.current
    if (!player) return
    dispatch(listeningAction.updatePlayer({ duration: player.duration || 0 }))
  }

  const handleTimeUpdate = () => {
    const player = playerRef.current
    // We only want to update time slider if we are not currently seeking
    if (!player || player.seeking) return

    console.log('onTimeUpdate', player.currentTime)

    if (!player.duration) return

    dispatch(
      listeningAction.updatePlayer({
        playedSeconds: player.currentTime,
        played: player.currentTime / player.duration,
      }),
    )
  }

  const handleToggleLoop = () => {
    dispatch(listeningAction.updatePlayer({ loop: !player.loop }))
  }

  const handleSetPlaybackRate = (event: React.SyntheticEvent<HTMLButtonElement>) => {
    const buttonTarget = event.target as HTMLButtonElement
    dispatch(
      listeningAction.updatePlayer({
        playbackRate: Number.parseFloat(`${buttonTarget.dataset.value}`),
      }),
    )
  }
  const handleRateChange = () => {
    const player = playerRef.current
    if (!player) return

    dispatch(
      listeningAction.updatePlayer({
        playbackRate: player.playbackRate,
      }),
    )
  }

  const handleProgress = () => {
    const player = playerRef.current
    // We only want to update time slider if we are not currently seeking
    if (!player || player.seeking || !player.buffered?.length) return

    dispatch(
      listeningAction.updatePlayer({
        loadedSeconds: player.buffered?.end(player.buffered?.length - 1),
        loaded: player.buffered?.end(player.buffered?.length - 1) / player.duration,
      }),
    )
  }

  const handleEnded = () => {
    loop ? dispatch(listeningAction.updatePlayer({ playing: true })) : onNext()
  }

  // ── Seek handlers (from official example) ─────────────────────────────────
  const handleSeekMouseDown = () => {
    dispatch(listeningAction.updatePlayer({ seeking: true }))
  }

  const handleSeekChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const inputTarget = event.target as HTMLInputElement
    dispatch(
      listeningAction.updatePlayer({
        played: Number.parseFloat(inputTarget.value),
      }),
    )
  }

  const handleSeekMouseUp = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const inputTarget = event.target as HTMLInputElement
    dispatch(listeningAction.updatePlayer({ seeking: false }))
    if (playerRef.current) {
      playerRef.current.currentTime =
        Number.parseFloat(inputTarget.value) * playerRef.current.duration
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const onPrev = () => {
    // if (!syncState.tracks.length) return
    // const nextIndex = (trackIndex - 1 + syncState.tracks.length) % syncState.tracks.length
  }

  const onNext = () => {
    // if (!syncState.tracks.length) return
    // const nextIndex = (syncState.currentIndex + 1) % syncState.tracks.length
  }

  const onSeekBy = (offset: number) => {
    const player = playerRef.current
    if (!player) return
    player.currentTime = Math.max(0, Math.min(player.currentTime + offset, player.duration || 0))
    dispatch(
      listeningAction.updatePlayer({
        playedSeconds: player.currentTime,
        played: player.duration ? player.currentTime / player.duration : 0,
      }),
    )
  }

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds))
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${String(sec).padStart(2, '0')}`
  }

  return (
    <>
      {/* Fixed footer dock */}
      <div className={`${styles.playerDock} ${!dockVisible ? styles.playerDockHidden : ''}`}>
        {/* Track list panel (appears inside dock, above controls) */}
        {trackListOpen && dockVisible && (
          <div className={styles.dockTrackList}>
            <div className={styles.dockTrackListHeader}>
              <span>Track list</span>
              <button className={styles.dockTrackListClose} onClick={() => setTrackListOpen(false)}>
                <CloseOutlined />
              </button>
            </div>
            <ul>
              {tracks.map((track, index) => (
                <li
                  key={`dock-track-${track.id ?? index}`}
                  className={index === trackIndex ? styles.active : ''}
                  onClick={() => {
                    setTrackListOpen(false)
                    dispatch(listeningAction.resetPlayer())
                    dispatch(listeningAction.setCurrentTrack(track))
                  }}
                >
                  {`${index + 1}. ${track.title}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* <div>
          {dockVisible && (
            <Button type='text' onClick={() => dispatch(settingAction.toggleDock())}>
              <CloseOutlined />
            </Button>
          )}
        </div> */}

        {/* Controls & seek bar */}
        <div className={styles.controls}>
          <div className={styles.dockControls}>
            <Button
              type={loop ? 'primary' : 'text'}
              size={'large'}
              title={'Repeat'}
              icon={<ReloadOutlined />}
              onClick={() => handleToggleLoop()}
            />

            <Button
              type='text'
              size={'large'}
              title={'Previous'}
              icon={<StepBackwardOutlined />}
              onClick={onPrev}
            />

            <Button
              type='text'
              size={'large'}
              title={'-10s'}
              icon={<FastBackwardOutlined />}
              onClick={() => onSeekBy(-10)}
            />

            <Button
              type='text'
              size={'large'}
              icon={playing ? <PauseCircleFilled /> : <PlayCircleFilled />}
              onClick={playing ? handlePause : handlePlay}
            />

            <Button
              type='text'
              size={'large'}
              title={'+10s'}
              icon={<FastForwardOutlined />}
              onClick={() => onSeekBy(10)}
            />

            <Button
              type='text'
              size={'large'}
              title={'Next'}
              icon={<StepForwardOutlined />}
              onClick={onNext}
            />

            <Button
              type={trackListOpen ? 'primary' : 'text'}
              icon={<UnorderedListOutlined />}
              onClick={() => setTrackListOpen((v) => !v)}
            />
          </div>

          <div className={styles.seekBar}>
            <span>{formatTime(duration * played)}</span>
            <input
              type='range'
              min={0}
              max={0.999999}
              step='any'
              value={played}
              onMouseDown={handleSeekMouseDown}
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Track info + seek bar */}
        <div className={styles.dockMeta}>
          <div className={styles.dockTitle}>{currentTrack?.title}</div>
          <div className={styles.liveTranscript}>asdfasdfasdfasdf asdfasdfa sdfas</div>
        </div>

        {/* Hidden ReactPlayer engine */}
        <div style={{ display: 'none' }}>
          <ReactPlayer
            ref={setPlayerRef}
            className='react-player'
            style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
            src={src}
            pip={pip}
            playing={playing}
            controls={controls}
            light={light}
            loop={loop}
            playbackRate={playbackRate}
            volume={volume}
            muted={muted}
            config={{
              youtube: {
                color: 'white',
              },
              vimeo: {
                color: 'ffffff',
              },
              spotify: {
                preferVideo: true,
              },
              tiktok: {
                fullscreen_button: true,
                progress_bar: true,
                play_button: true,
                volume_control: true,
                timestamp: false,
                music_info: false,
                description: false,
                rel: false,
                native_context_menu: true,
                closed_caption: false,
              },
            }}
            onLoadStart={() => console.log('onLoadStart')}
            onReady={() => console.log('onReady')}
            onStart={(e) => console.log('onStart', e)}
            onPlay={handlePlay}
            onPause={handlePause}
            onRateChange={handleRateChange}
            onSeeking={(e) => console.log('onSeeking', e)}
            onSeeked={(e) => console.log('onSeeked', e)}
            onEnded={handleEnded}
            onError={(e) => console.log('onError', e)}
            onTimeUpdate={handleTimeUpdate}
            onProgress={handleProgress}
            onDurationChange={handleDurationChange}
          />
        </div>
      </div>
    </>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Button, message, theme } from 'antd'
import ReactPlayer from 'react-player'
import styles from './style.module.scss'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { getActiveSegmentIndex, parseTranscript } from './transcriptUtils'
import { tracksApi } from '@/services/firebase'

export const PlayerDock = () => {
  const { token } = theme.useToken()
  const playerRef = useRef<HTMLVideoElement | null>(null)

  const [trackListOpen, setTrackListOpen] = useState(false)
  const [playerKey, setPlayerKey] = useState(0)

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)
  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  useEffect(() => {
    fetchTracks()
  }, [])

  const fetchTracks = async () => {
    try {
      const response = await tracksApi.getTracks({
        page: 1,
        size: 100,
        orderBy: 'created_date',
        order: 'DESC',
      })

      if (response.isSuccess && response.content) {
        dispatch(listeningAction.setTracks(response.content))
      } else {
        message.error(response.message || 'Failed to fetch tracks')
      }
    } catch (error: any) {
      message.error(error.message || 'Error fetching tracks')
    }
  }

  const {
    src,
    playing,
    controls,
    light,
    volume,
    muted,
    loop,
    played,
    duration,
    playbackRate,
    pip,
    seekTo,
    playedSeconds,
  } = player

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    playerRef.current = player
  }, [])

  const transcriptSegments = useMemo(
    () => parseTranscript(currentTrack?.transcript || ''),
    [currentTrack?.transcript],
  )
  const activeSegmentText = useMemo(() => {
    const idx = getActiveSegmentIndex(transcriptSegments, playedSeconds)
    return idx >= 0 ? transcriptSegments[idx].text : ''
  }, [transcriptSegments, playedSeconds])

  useEffect(() => {
    if (seekTo === null || seekTo === undefined) return
    if (!playerRef.current) return
    playerRef.current.currentTime = seekTo
    dispatch(listeningAction.updatePlayer({ seekTo: null, playing: true }))
  }, [seekTo])

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

  useEffect(() => {
    if (currentTrack) load(currentTrack.srcUrl)
  }, [currentTrack])

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
    console.log(`*** handleEnded *** `)
    if (loop) {
      setPlayerKey((prevKey) => prevKey + 1)
    } else {
      onNext()
    }
  }

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

  const onPrev = () => {
    dispatch(listeningAction.resetPlayer({ loop }))
    const index = trackIndex - 1 < 0 ? tracks.length - 1 : trackIndex - 1
    const item = tracks[index]
    dispatch(listeningAction.setCurrentTrack(item))
    setTimeout(() => handlePlay(), 1000)
  }

  const onNext = () => {
    dispatch(listeningAction.resetPlayer({ loop }))
    const index = trackIndex + 1 === tracks.length ? 0 : trackIndex + 1
    const item = tracks[index]
    dispatch(listeningAction.setCurrentTrack(item))
    setTimeout(() => handlePlay(), 1000)
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
    <div className={styles.playerDock}>
      {/* Track list panel (appears inside dock, above controls) */}
      {trackListOpen && (
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
                  dispatch(listeningAction.resetPlayer({ loop }))
                  dispatch(listeningAction.setCurrentTrack(track))
                }}
              >
                {`${index + 1}. ${track.title}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls & seek bar */}
      <div className={styles.controls}>
        <div className={styles.dockControls}>
          <Button
            type={'text'}
            title={'Repeat'}
            icon={<ReloadOutlined style={{ fontSize: '20px' }} />}
            style={{
              background: 'transparent',
              boxShadow: 'none',
              color: loop ? token.colorPrimary : token.colorText,
            }}
            onClick={() => handleToggleLoop()}
          />

          <Button
            type='text'
            title={'Previous'}
            icon={<StepBackwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
            onClick={onPrev}
          />

          <Button
            type='text'
            title={'-10s'}
            icon={<FastBackwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
            onClick={() => onSeekBy(-10)}
          />

          <Button
            type='text'
            icon={
              playing ? (
                <PauseCircleFilled style={{ fontSize: '20px', color: token.colorText }} />
              ) : (
                <PlayCircleFilled style={{ fontSize: '20px', color: token.colorText }} />
              )
            }
            onClick={playing ? handlePause : handlePlay}
          />

          <Button
            type='text'
            title={'+10s'}
            icon={<FastForwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
            onClick={() => onSeekBy(10)}
          />

          <Button
            type='text'
            title={'Next'}
            icon={<StepForwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
            onClick={onNext}
          />

          <Button
            type={trackListOpen ? 'primary' : 'text'}
            variant={'text'}
            style={{ background: 'transparent', boxShadow: 'none' }}
            icon={
              <UnorderedListOutlined
                style={{
                  fontSize: '20px',
                  color: trackListOpen ? token.colorPrimary : token.colorText,
                }}
              />
            }
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
        <div className={styles.dockTitle} title={currentTrack?.title}>
          {currentTrack?.title}
        </div>
        {activeSegmentText && <div className={styles.liveTranscript}>{activeSegmentText}</div>}
      </div>

      {/* Hidden ReactPlayer engine */}
      <div style={{ display: 'none' }}>
        <ReactPlayer
          key={playerKey}
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
  )
}

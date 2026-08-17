import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowsAltOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  ReloadOutlined,
  ShrinkOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { App, Button, theme } from 'antd'
import ReactPlayer from 'react-player'
import { createPortal } from 'react-dom'
import styles from './player.module.scss'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { getActiveSegmentIndex, parseTranscript } from './transcriptUtils'
import { KaraokeText } from './KaraokeText'
import { useSmoothTime } from './useSmoothTime'
import { tracksApi } from '@/services/firebase'
import { TrackList } from './TrackList'
import { firebaseAuthService } from '@/services/firebase/authService'

export const PlayerDock: React.FC = () => {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const playerRef = useRef<HTMLVideoElement | null>(null)
  const isFirstLoadRef = useRef(true)
  const shouldSeekOnReadyRef = useRef(false)

  const [trackListOpen, setTrackListOpen] = useState(false)
  const [playerKey, setPlayerKey] = useState(0)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const { currentTrack, tracks, player, showPlayer } = useSelector((state) => state.listening)
  const themeMode = useSelector((state) => state.setting.themeMode)

  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      if (user) {
        fetchTracks()
      } else {
        dispatch(listeningAction.setTracks([]))
      }
    })

    return () => unsubscribe()
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

  const toggleDocumentPiP = async () => {
    if (pipWindow) {
      pipWindow.close()
      setPipWindow(null)
      return
    }

    if (!('documentPictureInPicture' in window)) {
      message.warning(
        'Trình duyệt của bạn không hỗ trợ chế độ Document Picture-in-Picture. Hãy thử Chrome hoặc Edge.',
      )
      return
    }

    try {
      // @ts-ignore
      const w = await window.documentPictureInPicture.requestWindow({
        width: 500,
        height: 280,
      })

      const d = w.document

      // Copy all styles from the main window to the PiP window
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.cssRules) {
            const newStyle = d.createElement('style')
            const rules = Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('\n')
            newStyle.appendChild(d.createTextNode(rules))
            d.head.appendChild(newStyle)
          }
        } catch (e) {
          if (styleSheet.href) {
            const newLink = d.createElement('link')
            newLink.rel = 'stylesheet'
            newLink.href = styleSheet.href
            d.head.appendChild(newLink)
          }
        }
      })

      w.addEventListener('pagehide', () => {
        setPipWindow(null)
      })

      setPipWindow(w)
    } catch (err) {
      console.error(err)
      message.error('Không thể mở cửa sổ Picture-in-Picture.')
    }
  }

  // Synchronize theme attribute and CSS variables inside the PiP window document
  useEffect(() => {
    if (!pipWindow) return
    const d = pipWindow.document

    // Copy data-theme attribute
    d.documentElement.setAttribute('data-theme', themeMode)

    // Copy inline style attributes (which carry Ant Design CSS variables)
    const mainHtml = document.documentElement
    if (mainHtml.getAttribute('style')) {
      d.documentElement.setAttribute('style', mainHtml.getAttribute('style')!)
    } else {
      d.documentElement.removeAttribute('style')
    }

    if (document.body.getAttribute('style')) {
      d.body.setAttribute('style', document.body.getAttribute('style')!)
    } else {
      d.body.removeAttribute('style')
    }

    // Set dynamic body styles using computed background of .playerDock
    const playerDockEl = document.querySelector(`.${styles.playerDock}`)
    let bg = ''
    if (playerDockEl) {
      bg = window.getComputedStyle(playerDockEl).backgroundColor
    }
    d.body.style.background = bg || 'var(--ant-color-bg-container)'
    d.body.style.color = 'var(--ant-color-text)'
    d.body.style.margin = '0'
    d.body.style.display = 'flex'
    d.body.style.flexDirection = 'column'
    d.body.style.alignItems = 'center'
    d.body.style.justifyContent = 'center'
    d.body.style.height = '100vh'
    d.body.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    d.body.style.overflow = 'hidden'
  }, [themeMode, pipWindow])

  useEffect(() => {
    return () => {
      if (pipWindow) {
        pipWindow.close()
      }
    }
  }, [pipWindow])

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

  const smoothTime = useSmoothTime(playedSeconds, playing, playbackRate)

  const transcriptSegments = useMemo(
    () => parseTranscript(currentTrack?.transcript || ''),
    [currentTrack?.transcript],
  )
  const activeIndex = useMemo(() => {
    return getActiveSegmentIndex(transcriptSegments, smoothTime)
  }, [transcriptSegments, smoothTime])

  const activeSegmentText = useMemo(() => {
    return activeIndex >= 0 ? transcriptSegments[activeIndex].text : ''
  }, [transcriptSegments, activeIndex])

  const activeSegmentProgress = useMemo(() => {
    if (activeIndex < 0) return 0
    const seg = transcriptSegments[activeIndex]
    const startTime = seg.timeSeconds
    const endTime =
      activeIndex < transcriptSegments.length - 1
        ? transcriptSegments[activeIndex + 1].timeSeconds
        : player.duration || startTime + 5
    const segDuration = endTime - startTime
    const elapsed = smoothTime - startTime
    return segDuration > 0 ? Math.max(0, Math.min(100, (elapsed / segDuration) * 100)) : 0
  }, [transcriptSegments, activeIndex, smoothTime, player.duration])

  useEffect(() => {
    if (seekTo === null || seekTo === undefined) return
    if (!playerRef.current) return
    playerRef.current.currentTime = seekTo
    dispatch(listeningAction.updatePlayer({ seekTo: null, playing: true }))
  }, [seekTo])

  const handlePlay = () => {
    if (playerRef.current) {
      const current = playerRef.current.currentTime
      if (current < 1 && playedSeconds > 0 && Math.abs(current - playedSeconds) > 1) {
        playerRef.current.currentTime = playedSeconds
      }
    }
    dispatch(listeningAction.updatePlayer({ playing: true }))
  }
  const handlePause = () => dispatch(listeningAction.updatePlayer({ playing: false }))

  const load = (src?: string, startPosition?: number) => {
    dispatch(
      listeningAction.updatePlayer({
        ...player,
        src,
        playedSeconds: startPosition !== undefined ? startPosition : 0,
        played: startPosition !== undefined && duration ? startPosition / duration : 0,
        loaded: 0,
        pip: false,
        playing: false,
      }),
    )
  }

  const restoreTimeRef = useRef(0)

  useEffect(() => {
    if (currentTrack) {
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false

        let savedTime = 0
        try {
          const sessionStr = localStorage.getItem('enmory_playback_session')
          if (sessionStr) {
            const session = JSON.parse(sessionStr)
            if (session.trackId === currentTrack.id) {
              savedTime = session.playedSeconds || 0
            }
          }
        } catch (e) {
          console.error(e)
        }

        restoreTimeRef.current = savedTime
        shouldSeekOnReadyRef.current = savedTime > 0
        load(currentTrack.srcUrl, savedTime)
      } else {
        shouldSeekOnReadyRef.current = false
        load(currentTrack.srcUrl, 0)
      }
    }
  }, [currentTrack])

  const handleReady = () => {
    if (shouldSeekOnReadyRef.current) {
      if (playerRef.current) {
        playerRef.current.currentTime = restoreTimeRef.current
      }
      shouldSeekOnReadyRef.current = false
    }
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

    if (!player.duration) return

    if (currentTrack) {
      localStorage.setItem(
        'enmory_playback_session',
        JSON.stringify({
          trackId: currentTrack.id,
          playedSeconds: player.currentTime,
        }),
      )
    }

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
    <div
      className={styles.playerDock}
      style={{
        width: showPlayer ? '100%' : 50,
        padding: showPlayer ? token.size / 2 : 0,
        transition: 'width 0.3s ease, padding 0.3s ease',
      }}
    >
      {/* Track list panel (appears inside dock, above controls) */}
      {trackListOpen && (
        <div className={styles.dockTrackList}>
          <TrackList />
        </div>
      )}

      {/* Controls & seek bar */}
      {showPlayer && (
        <div className={styles.controls}>
          <div className={styles.dockControls}>
            <Button
              onClick={() => dispatch(listeningAction.toggleShowPlayer())}
              type='text'
              size={'large'}
              icon={
                showPlayer ? (
                  <ShrinkOutlined style={{ fontSize: 20 }} />
                ) : (
                  <ArrowsAltOutlined style={{ fontSize: 20 }} />
                )
              }
            />
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
              title={'-5s'}
              icon={<FastBackwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
              onClick={() => onSeekBy(-5)}
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
              title={'+5s'}
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
            <Button
              type='text'
              size={'large'}
              onClick={toggleDocumentPiP}
              icon={
                <svg
                  viewBox='0 0 24 24'
                  width='20'
                  height='20'
                  fill='currentColor'
                  style={{ verticalAlign: 'middle', color: pipWindow ? '#72a526' : 'inherit' }}
                >
                  <path d='M19 11h-8v6h8v-6zm4 8V5c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 0H3V5h18v14z' />
                </svg>
              }
              title='Picture in Picture'
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
      )}

      {/* Track info + seek bar */}
      <div className={styles.dockMeta}>
        <div className={styles.dockTitle} title={currentTrack?.title}>
          {showPlayer && currentTrack?.title}
        </div>
        {activeSegmentText && showPlayer && (
          <div className={styles.liveTranscript}>
            <KaraokeText text={activeSegmentText} progress={activeSegmentProgress} />
          </div>
        )}
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
          onReady={handleReady}
          onEnterPictureInPicture={() => dispatch(listeningAction.updatePlayer({ pip: true }))}
          onLeavePictureInPicture={() => dispatch(listeningAction.updatePlayer({ pip: false }))}
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

      {pipWindow &&
        createPortal(
          <div
            className={styles.playerDock}
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
              gap: '12px',
              position: 'relative',
              left: 'auto',
              top: 'auto',
              borderTop: 'none',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            }}
          >
            {/* Title */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--ant-color-primary)',
                maxWidth: '100%',
              }}
            >
              {currentTrack?.title || 'No Track Playing'}
            </div>

            {/* Karaoke text */}
            <div
              style={{
                fontSize: '20px',
                minHeight: '28px',
                lineHeight: '1.4',
                color: 'var(--ant-color-text)',
                fontWeight: 500,
                width: '100%',
                wordWrap: 'break-word',
              }}
            >
              {activeSegmentText ? (
                <KaraokeText text={activeSegmentText} progress={activeSegmentProgress} />
              ) : (
                <span style={{ color: 'var(--ant-color-text-description)' }}>...</span>
              )}
            </div>

            {/* Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: token.size,
                marginTop: '4px',
              }}
            >
              <Button
                type='text'
                title={'Previous'}
                style={{ fontSize: '18px', color: token.colorText }}
                icon={<StepBackwardOutlined />}
                onClick={onPrev}
              />

              <Button
                type='text'
                title={'-5s'}
                style={{ fontSize: '18px', color: token.colorText }}
                icon={<FastBackwardOutlined />}
                onClick={() => onSeekBy(-5)}
              />

              {playing ? (
                <Button
                  type='text'
                  style={{
                    color: 'var(--ant-color-text)',
                    fontSize: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  icon={<PauseCircleFilled style={{ fontSize: '36px' }} />}
                  onClick={handlePause}
                />
              ) : (
                <Button
                  type='text'
                  style={{
                    color: 'var(--ant-color-text)',
                    fontSize: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  icon={<PlayCircleFilled style={{ fontSize: '36px' }} />}
                  onClick={handlePlay}
                />
              )}

              <Button
                type='text'
                title={'+5s'}
                style={{ fontSize: '18px', color: token.colorText }}
                icon={<FastForwardOutlined />}
                onClick={() => onSeekBy(10)}
              />

              <Button
                type='text'
                title={'Next'}
                style={{ fontSize: '18px', color: token.colorText }}
                icon={<StepForwardOutlined />}
                onClick={onNext}
              />
            </div>
          </div>,
          pipWindow.document.body,
        )}
    </div>
  )
}

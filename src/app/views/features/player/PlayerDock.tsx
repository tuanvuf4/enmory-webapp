import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import appStyle from '@/style/appStyle.module.scss'
import {
  CaretRightFilled,
  FastBackwardOutlined,
  FastForwardOutlined,
  PauseCircleFilled,
  PauseOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Flex, MenuProps, Space, theme } from 'antd'
import ReactPlayer from 'react-player'
import { createPortal } from 'react-dom'
import styles from './player.module.scss'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { appSetting } from '@/config/appConfig'
import { getActiveSegmentIndex, parseTranscript } from './transcriptUtils'
import { KaraokeText } from './KaraokeText'
import { useSmoothTime } from './useSmoothTime'
import { tracksApi } from '@/services/firebase'
import { TrackList } from './TrackList'
import { firebaseAuthService } from '@/services/firebase/authService'
import { usePrompt } from '@/helpers/hooks'

export const PlayerDock: React.FC = () => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const playerRef = useRef<HTMLVideoElement | null>(null)
  const isFirstLoadRef = useRef(true)
  const shouldSeekOnReadyRef = useRef(false)
  const shouldAutoPlayOnReadyRef = useRef(false)
  const hasHandledTrackEndRef = useRef(false)
  const lastInvalidSpotifySrcRef = useRef<string | null>(null)

  const [trackListOpen, setTrackListOpen] = useState(false)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)
  const { user } = useSelector((state) => state.auth)
  const showPlayer = user?.configuration?.showPlayer ?? appSetting.meta.showPlayer

  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  const normalizeMediaSrc = useCallback((rawSrc?: string) => {
    if (!rawSrc) return rawSrc

    let normalized = rawSrc.trim()

    if (normalized.includes('<iframe')) {
      const match = normalized.match(/src=["']([^"']+)["']/i)
      if (match?.[1]) {
        normalized = match[1]
      }
    }

    try {
      const parsed = new URL(normalized)
      const host = parsed.hostname.toLowerCase()

      if (host === 'open.spotify.com' || host === 'www.open.spotify.com') {
        const segments = parsed.pathname.split('/').filter(Boolean)

        if (segments[0]?.startsWith('intl-')) {
          segments.shift()
        }

        if (segments[0] === 'embed') {
          segments.shift()
        }

        const supportedTypes = new Set(['track', 'album', 'playlist', 'artist', 'episode', 'show'])

        const type = segments[0]
        const id = segments[1]

        if (type && id && supportedTypes.has(type)) {
          return `https://open.spotify.com/${type}/${id}`
        }
      }
    } catch (e) {
      // Keep original value for non-URL sources.
    }

    return normalized
  }, [])

  // const handleToggleShowPlayer = async () => {
  //   const currentConfig = user?.configuration || appSetting.meta
  //   const newConfig = {
  //     ...currentConfig,
  //     showPlayer: !showPlayer,
  //   }
  //   dispatch(authAction.updateUserConfig(newConfig))
  //   if (user?.uid) {
  //     try {
  //       await apiUser.updateUserConfig(newConfig)
  //     } catch (err) {
  //       console.error('Failed to update showPlayer config:', err)
  //     }
  //   }
  // }

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
        message({ type: 'error', content: response.message || 'Failed to fetch tracks' })
      }
    } catch (error: any) {
      message({ type: 'error', content: error.message || 'Error fetching tracks' })
    }
  }

  const toggleDocumentPiP = async () => {
    if (pipWindow) {
      pipWindow.close()
      setPipWindow(null)
      return
    }

    if (!('documentPictureInPicture' in window)) {
      message({
        type: 'warning',
        content:
          'Trình duyệt của bạn không hỗ trợ chế độ Document Picture-in-Picture. Hãy thử Chrome hoặc Edge.',
      })
      return
    }

    try {
      // @ts-ignore
      const w = await window.documentPictureInPicture.requestWindow({
        width: 500,
        height: 350,
      })

      const d = w.document

      // Copy all styles from the main window to the PiP window
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.cssRules && styleSheet.cssRules.length > 0) {
            const newStyle = d.createElement('style')
            const rules = Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('\n')
            newStyle.appendChild(d.createTextNode(rules))
            d.head.appendChild(newStyle)
          } else if (styleSheet.href) {
            const newLink = d.createElement('link')
            newLink.rel = 'stylesheet'
            newLink.href = styleSheet.href
            d.head.appendChild(newLink)
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

      // Also copy any direct <style> or <link> tags in document.head that might not be in document.styleSheets
      document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
        if (el.tagName.toLowerCase() === 'link') {
          const href = (el as HTMLLinkElement).href
          if (href && !d.head.querySelector(`link[href="${href}"]`)) {
            d.head.appendChild(el.cloneNode(true))
          }
        } else if (el.tagName.toLowerCase() === 'style' && el.textContent) {
          const newStyle = d.createElement('style')
          newStyle.textContent = el.textContent
          d.head.appendChild(newStyle)
        }
      })

      w.addEventListener('pagehide', () => {
        setPipWindow(null)
      })

      setPipWindow(w)
    } catch (err) {
      console.error(err)
      message({ type: 'error', content: 'Không thể mở cửa sổ Picture-in-Picture.' })
    }
  }

  // Set fixed styling inside the PiP window document (independent of app theme)
  useEffect(() => {
    if (!pipWindow) return
    const d = pipWindow.document

    d.documentElement.setAttribute('data-theme', 'dark')
    d.body.style.margin = '0'
    d.body.style.padding = '0'
    d.body.style.backgroundColor = '#054753'
    d.body.style.color = '#8ea5b0'
    d.body.style.fontFamily = "'Lora', Georgia, serif"
    d.body.style.overflow = 'hidden'
  }, [pipWindow])

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
    seekTo,
    playedSeconds,
  } = player

  const resolvedSrc = useMemo(() => normalizeMediaSrc(src), [src, normalizeMediaSrc])

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    playerRef.current = player
  }, [])

  const playedSecondsRef = useRef(playedSeconds)

  useEffect(() => {
    playedSecondsRef.current = playedSeconds
  }, [playedSeconds])

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
      const latestPlayedSeconds = playedSecondsRef.current
      const hasDuration = duration > 0
      const isAtEnd = hasDuration && latestPlayedSeconds >= duration - 1

      if (hasDuration && current >= duration - 1) {
        playerRef.current.currentTime = 0
        dispatch(
          listeningAction.updatePlayer({
            played: 0,
            playedSeconds: 0,
          }),
        )
      } else if (
        current < 1 &&
        latestPlayedSeconds > 0 &&
        Math.abs(current - latestPlayedSeconds) > 1 &&
        !isAtEnd
      ) {
        playerRef.current.currentTime = latestPlayedSeconds
      }
    }
    dispatch(listeningAction.updatePlayer({ playing: true }))
  }

  const handlePause = () => dispatch(listeningAction.updatePlayer({ playing: false }))

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const targetDoc = event.view?.document || document
      const activeEl = targetDoc.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.hasAttribute('contenteditable'))
      ) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        if (playing) {
          handlePause()
        } else {
          handlePlay()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    if (pipWindow) {
      pipWindow.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (pipWindow) {
        pipWindow.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [playing, pipWindow])

  const load = (src?: string, startPosition?: number) => {
    const normalizedSrc = normalizeMediaSrc(src)
    hasHandledTrackEndRef.current = false

    dispatch(
      listeningAction.updatePlayer({
        ...player,
        src: normalizedSrc,
        playedSeconds: startPosition !== undefined ? startPosition : 0,
        played: startPosition !== undefined && duration ? startPosition / duration : 0,
        loaded: 0,
        pip: false,
        playing: false,
      }),
    )
  }

  useEffect(() => {
    if (!src) return

    const raw = src.trim()
    const isSpotifyShortLink = /https?:\/\/(spotify\.link|spoti\.fi)\//i.test(raw)

    if (isSpotifyShortLink && lastInvalidSpotifySrcRef.current !== raw) {
      lastInvalidSpotifySrcRef.current = raw
      message({
        type: 'warning',
        content:
          'Spotify short link (spotify.link/spoti.fi) chưa được hỗ trợ trực tiếp. Hãy dùng link dạng https://open.spotify.com/track/...',
      })
    }
  }, [src, message])

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

    if (shouldAutoPlayOnReadyRef.current) {
      dispatch(listeningAction.updatePlayer({ playing: true }))
      shouldAutoPlayOnReadyRef.current = false
    }
  }

  const handlePlaybackEnded = () => {
    if (hasHandledTrackEndRef.current) return
    hasHandledTrackEndRef.current = true

    if (loop) {
      if (playerRef.current) {
        playerRef.current.currentTime = 0
      }

      dispatch(
        listeningAction.updatePlayer({
          playing: true,
          played: 0,
          playedSeconds: 0,
        }),
      )
      return
    }

    onNext()
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

    const remaining = player.duration - player.currentTime
    if (remaining <= 0.15) {
      handlePlaybackEnded()
      return
    }

    if (remaining > 0.5) {
      hasHandledTrackEndRef.current = false
    }

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
    handlePlaybackEnded()
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
    if (!tracks.length) return
    if (playerRef.current) playerRef.current.currentTime = 0
    dispatch(
      listeningAction.resetPlayer({
        loop,
        playing: false,
        loaded: 0,
        loadedSeconds: 0,
        played: 0,
        playedSeconds: 0,
      }),
    )
    const index = trackIndex - 1 < 0 ? tracks.length - 1 : trackIndex - 1
    const item = tracks[index]
    shouldAutoPlayOnReadyRef.current = true
    hasHandledTrackEndRef.current = false
    dispatch(listeningAction.setCurrentTrack(item))
  }

  const onNext = () => {
    if (!tracks.length) return
    if (playerRef.current) playerRef.current.currentTime = 0
    dispatch(
      listeningAction.resetPlayer({
        loop,
        playing: false,
        loaded: 0,
        loadedSeconds: 0,
        played: 0,
        playedSeconds: 0,
      }),
    )
    const index = trackIndex + 1 === tracks.length ? 0 : trackIndex + 1
    const item = tracks[index]
    shouldAutoPlayOnReadyRef.current = true
    hasHandledTrackEndRef.current = false
    dispatch(listeningAction.setCurrentTrack(item))
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

  const speedMenuProps: MenuProps = {
    items: [
      { key: '0.5', label: '0.5x' },
      { key: '0.75', label: '0.75x' },
      { key: '1', label: '1x' },
      { key: '1.25', label: '1.25x' },
      { key: '1.5', label: '1.5x' },
    ],
    selectable: true,
    selectedKeys: [String(playbackRate)],
    onClick: (e) => {
      const speed = Number.parseFloat(e.key)
      dispatch(listeningAction.updatePlayer({ playbackRate: speed }))
    },
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

      {/* Track info + seek bar */}
      {showPlayer && (
        <div className={styles.dockMeta}>
          <div className={styles.dockTitle} title={currentTrack?.title}>
            {currentTrack?.title}
          </div>

          {activeSegmentText && (
            <div className={styles.liveTranscript}>
              <KaraokeText text={activeSegmentText} progress={activeSegmentProgress} />
            </div>
          )}
        </div>
      )}

      {showPlayer && (
        <Space size={[0, 8]} direction={'vertical'}>
          {/* controls */}
          <Flex gap={token.size / 4}>
            <Button
              type={trackListOpen ? 'primary' : 'text'}
              variant={'text'}
              size={'middle'}
              style={{ background: 'transparent', boxShadow: 'none' }}
              icon={
                <UnorderedListOutlined
                  style={{
                    fontSize: '20px',
                    color: trackListOpen ? token.palette?.yellow?.[0] : token.colorText,
                  }}
                />
              }
              onClick={() => setTrackListOpen((v) => !v)}
            />

            <Dropdown menu={speedMenuProps} trigger={['click']} placement='bottomLeft'>
              <Button type='text' title={'Rate'} size={'middle'} className={appStyle.fromXs}>
                {playbackRate}x
              </Button>
            </Dropdown>

            <Button
              type='text'
              size={'middle'}
              title={'Previous'}
              icon={<StepBackwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
              onClick={onPrev}
            />

            <Button
              type='text'
              size={'middle'}
              title={'-10s'}
              icon={<FastBackwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
              onClick={() => onSeekBy(-10)}
            />

            <Button
              type='text'
              size={'middle'}
              icon={
                playing ? (
                  <PauseCircleFilled
                    style={{ fontSize: '20px', color: token.palette?.yellow?.[0] }}
                  />
                ) : (
                  <PlayCircleFilled
                    style={{ fontSize: '20px', color: token.palette?.yellow?.[0] }}
                  />
                )
              }
              onClick={playing ? handlePause : handlePlay}
            />

            <Button
              type='text'
              title={'+5s'}
              size={'middle'}
              icon={<FastForwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
              onClick={() => onSeekBy(10)}
            />

            <Button
              type='text'
              title={'Next'}
              size={'middle'}
              icon={<StepForwardOutlined style={{ fontSize: '20px', color: token.colorText }} />}
              onClick={onNext}
            />

            <Button
              type={'text'}
              size={'middle'}
              title={'Repeat'}
              icon={<ReloadOutlined style={{ fontSize: '20px' }} />}
              style={{
                background: 'transparent',
                boxShadow: 'none',
                color: loop ? token.palette?.yellow?.[0] : token.colorText,
              }}
              onClick={() => handleToggleLoop()}
            />

            <Button
              type='text'
              size={'middle'}
              onClick={toggleDocumentPiP}
              className={appStyle.fromXs}
              icon={
                <svg
                  viewBox='0 0 24 24'
                  width='22'
                  height='22'
                  fill='currentColor'
                  style={{ color: pipWindow ? token.palette?.yellow?.[0] : 'inherit' }}
                >
                  <path d='M19 11h-8v6h8v-6zm4 8V5c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 0H3V5h18v14z' />
                </svg>
              }
              title='Picture in Picture'
            />
          </Flex>

          {/* seek bar */}
          <Flex gap={token.size / 2} align={'center'}>
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
          </Flex>
        </Space>
      )}

      {/* Hidden ReactPlayer engine */}
      <div style={{ display: 'none' }}>
        <ReactPlayer
          ref={setPlayerRef}
          className='react-player'
          style={{ width: 1, height: 1 }}
          src={resolvedSrc}
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
          // onLoadStart={() => console.log('onLoadStart')}
          onReady={handleReady}
          // onStart={(e) => console.log('onStart', e)}
          onPlay={handlePlay}
          onPause={handlePause}
          onRateChange={handleRateChange}
          // onSeeking={(e) => console.log('onSeeking', e)}
          // onSeeked={(e) => console.log('onSeeked', e)}
          onEnded={handleEnded}
          // onError={(e) => console.log('onError', e)}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onDurationChange={handleDurationChange}
        />
      </div>

      {pipWindow &&
        createPortal(
          <div className={styles.pipContainer}>
            {/* Title */}
            <div className={styles.pipTitle}>{currentTrack?.title || 'No Track Playing'}</div>

            {/* Karaoke text */}
            <div className={styles.pipContentWrapper}>
              <div className={styles.pipKaraokeText}>
                {activeSegmentText ? (
                  <KaraokeText text={activeSegmentText} progress={activeSegmentProgress} />
                ) : (
                  <span style={{ color: '#8ea5b0', opacity: 0.6 }}>...</span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className={styles.pipControls}>
              <Button
                type='text'
                title={'Previous'}
                className={styles.pipBtnSecondary}
                icon={<StepBackwardOutlined />}
                onClick={onPrev}
              />

              <Button
                type='text'
                title={'-10s'}
                className={styles.pipBtnSecondary}
                icon={<FastBackwardOutlined />}
                onClick={() => onSeekBy(-10)}
              />

              <Button
                type='text'
                className={styles.pipBtnPlay}
                icon={
                  playing ? (
                    <PauseOutlined style={{ fontSize: '20px', color: '#054753' }} />
                  ) : (
                    <CaretRightFilled
                      style={{ fontSize: '22px', color: '#054753', marginLeft: '3px' }}
                    />
                  )
                }
                onClick={playing ? handlePause : handlePlay}
              />

              <Button
                type='text'
                title={'+5s'}
                className={styles.pipBtnSecondary}
                icon={<FastForwardOutlined />}
                onClick={() => onSeekBy(10)}
              />

              <Button
                type='text'
                title={'Next'}
                className={styles.pipBtnSecondary}
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

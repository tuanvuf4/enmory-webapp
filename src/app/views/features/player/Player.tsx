import { Space, theme } from 'antd'
import styles from './player.module.scss'
import clsx from 'clsx'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { LiveTranscript } from './LiveTranscript'
import { TrackList } from './TrackList'

export const Player: React.FC = () => {
  const { token } = theme.useToken()

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)

  const dispatch = useDispatch()

  return (
    <div className={styles.playerWrapper}>
      <Space direction={'vertical'} size={token.size} style={{ width: '100%' }}>
        <div className={styles.audioPlayer} style={{ background: token.colorBgContainer }}>
          <div className={styles.playerCard}>
            <div className={styles.nowPlaying}>
              <div className={styles.trackTitle}>
                {tracks.findIndex((t) => t.id === currentTrack?.id) !== -1
                  ? tracks.find((t) => t.id === currentTrack?.id)?.title
                  : 'No track selected'}
              </div>
              <div
                className={styles.trackDescription}
                dangerouslySetInnerHTML={{
                  __html: currentTrack?.description || 'No description available',
                }}
              />
            </div>
          </div>

          <TrackList />
        </div>

        {currentTrack?.transcript && (
          <div
            className={clsx(styles.audioPlayer, styles.transcriptCard)}
            style={{ background: token.colorBgContainer }}
          >
            <LiveTranscript
              transcript={currentTrack.transcript}
              playedSeconds={player.playedSeconds}
              onSeekTo={(seconds) =>
                dispatch(listeningAction.updatePlayer({ seekTo: seconds, playing: true }))
              }
            />
          </div>
        )}
      </Space>
    </div>
  )
}

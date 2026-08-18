import { Flex, Space, theme } from 'antd'
import styles from './player.module.scss'
import clsx from 'clsx'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { LiveTranscript } from './LiveTranscript'
import { TrackList } from './TrackList'
import { Tags } from '@/views/components'

export const Player: React.FC = () => {
  const { token } = theme.useToken()

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)

  const dispatch = useDispatch()

  return (
    <div className={styles.playerWrapper}>
      <Space direction={'vertical'} size={token.size} style={{ width: '100%' }}>
        <Flex gap={token.size} wrap={true} style={{ background: token.colorBgContainer }}>
          <Space direction={'vertical'} size={token.size} style={{ flex: 1, padding: token.size }}>
            <h3 style={{ color: token.colorPrimary, fontSize: token.fontSizeHeading4, margin: 0 }}>
              {tracks.findIndex((t) => t.id === currentTrack?.id) !== -1
                ? tracks.find((t) => t.id === currentTrack?.id)?.title
                : 'No track selected'}
            </h3>

            <div
              className={styles.trackDescription}
              dangerouslySetInnerHTML={{
                __html: currentTrack?.description || 'No description available',
              }}
            />

            <Tags label={'Tags'} searchBy={'tags'} tags={currentTrack?.tags || []} />

            <Tags label={'Relation'} tags={currentTrack?.relation || []} />
          </Space>

          <TrackList />
        </Flex>

        {currentTrack?.transcript && (
          <div
            className={clsx(styles.transcriptCard)}
            style={{ background: token.colorBgContainer }}
          >
            <LiveTranscript
              transcript={currentTrack.transcript}
              playedSeconds={player.playedSeconds}
              duration={player.duration}
              playing={player.playing}
              playbackRate={player.playbackRate}
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

import { Button } from 'antd'
import styles from './style.module.scss'
import { styleConfig } from '@/style/appStyle'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import clsx from 'clsx'
import { usePrompt } from '@/helpers/hooks'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { LiveTranscript } from './LiveTranscript'

interface IProps {
  onAdd: () => void
  onDelete: (id: number) => void
  onCurrentUpdating: (id: number) => void
}

export const Player: React.FC<IProps> = ({ onAdd, onDelete, onCurrentUpdating }) => {
  const { confirmDeleteModal } = usePrompt()

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)
  const dispatch = useDispatch()

  const handleDelete = (trackId: number, trackTitle: string) => {
    confirmDeleteModal({
      title: 'Delete Track',
      content: `Are you sure you want to delete "${trackTitle}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onDelete(trackId)
      },
    })
  }

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  return (
    <div className={styles.playerWrapper}>
      <div className={styles.audioPlayer}>
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

        <div className={styles.tracks}>
          <div className={styles.tracksTitle}>
            <span>Track list</span>

            <Button
              type={'text'}
              variant={'text'}
              style={{ color: 'var(--ant-color-white)' }}
              icon={<PlusOutlined />}
              onClick={onAdd}
            />
          </div>

          <div className={styles.tracksContent}>
            <ul>
              {tracks.map((track, key) => (
                <li
                  className={key === trackIndex ? styles.active : ''}
                  key={`track-${track.id}`}
                  onClick={() => {
                    dispatch(listeningAction.resetPlayer())
                    dispatch(listeningAction.setCurrentTrack(track))
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div>{`${key + 1}. ${track.title}`}</div>

                  <div className={styles.actionGroup}>
                    <Button
                      size='small'
                      type='text'
                      style={{
                        background: 'transparent',
                        color: styleConfig.color.yellow[4],
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCurrentUpdating(track.id as number)
                      }}
                    >
                      <EditOutlined />
                    </Button>

                    <Button
                      size='small'
                      type='text'
                      danger
                      style={{ background: 'transparent' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(track.id as number, track.title)
                      }}
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

      {currentTrack?.transcript && (
        <div className={clsx(styles.audioPlayer, styles.transcriptCard)}>
          <LiveTranscript
            transcript={currentTrack.transcript}
            playedSeconds={player.playedSeconds}
            onSeekTo={(seconds) =>
              dispatch(listeningAction.updatePlayer({ seekTo: seconds, playing: true }))
            }
          />
        </div>
      )}
    </div>
  )
}

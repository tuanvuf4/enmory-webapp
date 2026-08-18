import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import styles from './player.module.scss'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'

import { usePlayer } from '@/helpers/hooks'

export const TrackList: React.FC = () => {
  const { currentTrack, tracks, player } = useSelector((state) => state.listening)

  const { token } = theme.useToken()

  const { handleDeleteTrack, handleUpdateTrack, handleCreateTrack } = usePlayer()

  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  return (
    <div className={styles.tracks}>
      <div className={styles.tracksTitle}>
        <span>Track list</span>

        <Button
          size={'small'}
          variant={'outlined'}
          icon={<PlusOutlined />}
          onClick={() => handleCreateTrack()}
        />
      </div>

      <div className={styles.tracksContent}>
        <ul>
          {tracks.map((track, key) => (
            <li
              className={key === trackIndex ? styles.active : ''}
              key={`track-${track.id}`}
              onClick={() => {
                dispatch(
                  listeningAction.resetPlayer({
                    loop: player.loop,
                  }),
                )
                dispatch(listeningAction.setCurrentTrack(track))
              }}
            >
              <div>{`${key + 1}. ${track.title}`}</div>

              <div className={styles.actionGroup}>
                <Button
                  size='small'
                  type='text'
                  variant={'text'}
                  style={{ color: token.palette?.yellow?.[7] }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdateTrack(track.id as number)
                  }}
                >
                  <EditOutlined />
                </Button>

                <Button
                  size='small'
                  type='text'
                  variant={'text'}
                  style={{ color: token.palette?.red?.[6] }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTrack(track.id as number, track.title)
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
  )
}

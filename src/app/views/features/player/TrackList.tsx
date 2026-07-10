import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, message, theme } from 'antd'
import styles from './player.module.scss'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'

import { usePlayer } from '@/helpers/hooks/usePlayer'
import { MediaUploadModal } from '../modals/mediaUploadModal/MediaUploadModal'
import { ITracks } from '@/models/index'
import { settingAction } from '@/store/reducers/setting.reducer'
import { useState } from 'react'

export const TrackList: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<ITracks | undefined>(undefined)

  const { currentTrack, tracks, player } = useSelector((state) => state.listening)

  const { token } = theme.useToken()

  const { handleDelete } = usePlayer()

  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  const onAdd = () => {
    setSelectedTrack(undefined)
    setOpen(true)
  }

  const onUpdating = (trackId: number) => {
    const track = tracks.find((t) => t.id === trackId)
    if (track) {
      setSelectedTrack(track)
      setOpen(true)
    }
  }

  const onConfirmTrack = (track: ITracks) => {
    if (selectedTrack?.id) {
      // Update existing track
      dispatch(listeningAction.updateTrack(track))
    } else {
      // Add new track to the beginning (latest first)
      dispatch(listeningAction.addTrack(track))
      // Increment trackIndex index since new track is added at the beginning
      dispatch(settingAction.setTrackIndex(trackIndex + 1))
      message.success('Track added successfully')
    }
    setOpen(false)
    setSelectedTrack(undefined)
  }

  return (
    <>
      <div className={styles.tracks}>
        <div className={styles.tracksTitle}>
          <span>Track list</span>

          <Button size={'small'} variant={'outlined'} icon={<PlusOutlined />} onClick={onAdd} />
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
                      onUpdating(track.id as number)
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

      <MediaUploadModal
        open={open}
        onCancel={() => {
          setOpen(false)
          setSelectedTrack(undefined)
        }}
        onConfirm={onConfirmTrack}
        trackData={selectedTrack}
      />
    </>
  )
}

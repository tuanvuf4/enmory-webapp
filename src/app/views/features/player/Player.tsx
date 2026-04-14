import { useEffect, useState } from 'react'
import { Button, theme } from 'antd'
import styles from './style.module.scss'
import { styleConfig } from '@/style/appStyle'
import { CaretRightFilled, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { ITracks } from '@/models/media.model'
import { TSourceTypes } from '@/constant/media'
import clsx from 'clsx'
import { usePrompt } from '@/helpers/hooks'

interface IProps {
  tracks: ITracks[]
  current: number
  onAdd: () => void
  setTrackIndex: (index: number) => void
  onDelete: (id: number) => void
  onCurrentUpdating: (id: number) => void
  onSelectTrack: (index: number) => void
}

export const Player: React.FC<IProps> = ({
  tracks,
  current,
  onAdd,
  onDelete,
  onCurrentUpdating,
  onSelectTrack,
}) => {
  const { token } = theme.useToken()
  const { confirmDeleteModal } = usePrompt()

  const [currentTrack, setCurrentTrack] = useState<ITracks | null>(null)

  const [show, setShow] = useState(true)

  useEffect(() => {
    if (tracks.length > 0 && current >= 0) {
      setCurrentTrack(tracks[current])
    }
  }, [tracks, current])

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

  return (
    <div className={styles.playerWrapper}>
      <div className={styles.audioPlayer}>
        <div className={styles.player}>
          {currentTrack?.srcUrl && (
            <>
              {currentTrack.srcType === TSourceTypes.IFRAME && (
                <div
                  className={styles.iFrameSrc}
                  dangerouslySetInnerHTML={{ __html: currentTrack?.srcUrl || '' }}
                />
              )}

              {currentTrack.srcType === TSourceTypes.EMBED && (
                <div className={styles.iFrameSrc}>
                  <iframe src={currentTrack?.srcUrl || ''} frameBorder='0'></iframe>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.tracks}>
          <div className={styles.tracksTitle}>
            <Button
              style={{
                background: 'transparent',
                color: token.colorWhite,
                border: 'none',
              }}
              icon={
                show ? (
                  <CaretRightFilled style={{ transform: 'rotate(90deg)' }} />
                ) : (
                  <CaretRightFilled />
                )
              }
              onClick={() => setShow(!show)}
            />

            <Button
              style={{
                background: 'transparent',
                color: token.colorWhite,
                border: 'none',
              }}
              icon={<PlusOutlined />}
              onClick={onAdd}
            />
          </div>

          {show && (
            <div className={styles.tracksContent}>
              <ul>
                {tracks.map((track, key) => (
                  <li
                    className={key === current ? styles.active : ''}
                    key={`track-${track.id}`}
                    onClick={() => onSelectTrack(key)}
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
          )}
        </div>
      </div>

      {currentTrack?.transcript && (
        <div
          className={clsx(styles.audioPlayer, 'p-4')}
          style={{ margin: '0 auto', display: 'block' }}
        >
          <h3>Transcript:</h3>

          <div
            className={styles.transcript}
            dangerouslySetInnerHTML={{ __html: currentTrack?.transcript || '' }}
          />
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Button, theme } from 'antd'
import styles from './style.module.scss'
import { styleConfig } from '@/style/appStyle'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { ITracks } from '@/models/media.model'
import { appSetting } from '@/config/appConfig'
import { TSourceTypes } from '@/constant/media'

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

  const [currentTrack, setCurrentTrack] = useState<ITracks | null>(null)

  useEffect(() => {
    if (tracks.length > 0 && current >= 0) {
      setCurrentTrack(tracks[current])
    }
  }, [tracks, current])

  return (
    <div className={styles.audioPlayer} id={'audioPlayer'}>
      <div className={styles.player}>
        {currentTrack?.srcUrl && (
          <>
            {currentTrack.srcType === TSourceTypes.IFRAME && (
              <div
                className={styles.iframeExtSrc}
                dangerouslySetInnerHTML={{ __html: currentTrack?.srcUrl || '' }}
              />
            )}

            {currentTrack.srcType === TSourceTypes.EMBED && (
              <div className={styles.iframeExtSrc}>
                <iframe src={currentTrack?.srcUrl || ''} frameBorder='0'></iframe>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.tracks}>
        <div className={styles.tracksTitle}>
          {tracks.length <= appSetting.listening.maxMediaItem * 4 && (
            <Button
              style={{
                background: 'transparent',
                color: token.colorWhite,
                border: 'none',
              }}
              icon={<PlusOutlined />}
              onClick={onAdd}
            />
          )}
        </div>

        <div className={styles.tracksContent}>
          <ul>
            {tracks.map((track, key) => (
              <li
                className={key === current ? styles.active : ''}
                key={key}
                onClick={() => onSelectTrack(key)}
                style={{ cursor: 'pointer' }}
              >
                <div>{track.title}</div>

                <div className={styles.actionGroup}>
                  <Button
                    size='small'
                    type='text'
                    style={{
                      background: 'transparent',
                      color: styleConfig.color.yellow[4],
                    }}
                    onClick={() => onCurrentUpdating(track.id as number)}
                  >
                    <EditOutlined />
                  </Button>

                  <Button
                    size='small'
                    type='text'
                    danger
                    style={{ background: 'transparent' }}
                    onClick={() => onDelete(track.id as number)}
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
  )
}

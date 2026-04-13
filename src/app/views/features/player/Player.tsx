import { useEffect, useState } from 'react'
import { Button, theme } from 'antd'
import styles from './style.module.scss'
import { styleConfig } from '@/style/appStyle'
import { DeleteOutlined, EditOutlined, MenuOutlined, PlusOutlined } from '@ant-design/icons'
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
}

export const Player: React.FC<IProps> = ({
  tracks,
  current,
  onAdd,
  onDelete,
  onCurrentUpdating,
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
          {/* <h2>
            <Dropdown menu={{ items }} trigger={['click']} placement='bottomLeft' arrow>
              <Button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: token.colorWhite,
                  padding: `${token.size / 2}px 0`,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                <CaretDownOutlined /> {mediaSrc}
                {mediaSrc === EMediaSrc.INTERNAL && (
                  <span className={styles.quantity}>
                    ({tracks.filter((track) => track.internalUrl).length})
                  </span>
                )}
                {mediaSrc === EMediaSrc.EXTERNAL && (
                  <span className={styles.quantity}>
                    ({tracks.filter((track) => track.externalUrl).length})
                  </span>
                )}
              </Button>
            </Dropdown>
          </h2> */}

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
              <li className={key === current ? styles.active : ''} key={key}>
                <div>{track.title}</div>

                <div style={{ flex: '1 0', userSelect: 'none' }}>
                  {/* <h4
                    className={styles.trackTitle}
                    onClick={() => {
                      setTrackIndex(key)
                      if (mediaSrc === EMediaSrc.INTERNAL)
                        setIsPlaying(isPlaying && key === current ? false : true)
                    }}
                  >
                    {track.title}
                  </h4> */}
                  {/* <span className={styles.trackAuthor}>
                    {track.user.firstName + ' ' + track.user.lastName}
                  </span> */}
                </div>

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

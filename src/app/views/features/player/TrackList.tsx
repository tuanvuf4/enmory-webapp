import {
  CaretDownFilled,
  CaretUpFilled,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Button, Flex, theme } from 'antd'
import { useDispatch, useSelector } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import styles from './player.module.scss'

import { usePlayer } from '@/helpers/hooks'
import { useState } from 'react'

export const TrackList: React.FC = () => {
  const { currentTrack, tracks, player } = useSelector((state) => state.listening)
  const [show, setShow] = useState(true)

  const { token } = theme.useToken()

  const { handleDeleteTrack, handleUpdateTrack, handleCreateTrack } = usePlayer()

  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  return (
    <Flex vertical wrap className={styles.tracks}>
      <Flex
        justify={'space-between'}
        align={'center'}
        style={{
          borderBottom: `1px solid ${token.colorBorder}`,
          padding: token.size / 2,
          paddingRight: token.size * 0.75,
        }}
      >
        <Flex align='center' gap={4}>
          <Button
            size='small'
            variant={'text'}
            type={'text'}
            icon={show ? <CaretUpFilled /> : <CaretDownFilled />}
            onClick={() => setShow(!show)}
            style={{ background: 'transparent' }}
          />

          <span style={{ fontStyle: 'italic' }}>Track list</span>
        </Flex>

        <Button
          size={'small'}
          variant={'outlined'}
          icon={<PlusOutlined />}
          onClick={() => handleCreateTrack()}
        />
      </Flex>

      {show && (
        <ul className={styles.trackList}>
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

              <div className={styles.action}>
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
      )}
    </Flex>
  )
}

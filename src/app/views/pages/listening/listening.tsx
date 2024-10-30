import gStyles from '@/style/appStyle'
import { defaultSetting } from '@config/appConfig'
import { useAppDispatch, useAppSelector } from '@core/hooks'
import { EMediaSrc, EListeningTypes } from '@models/dictation.model'
import { mediaApi } from '@services/api'
import { actionAsyncMedia } from '@store/async/media.async'
import { mediaAction } from '@store/reducers/media.reducer'
import { settingAction } from '@store/reducers/setting.reducer'
import { Dictation } from '@views/features/dictation/dictation'
import { Exercise } from '@views/features/exercise/exercise'
import { AudioPlayer } from '@views/features/player/audioPlayer'
import { theme, Col, Skeleton, Space, Row } from 'antd'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

export const Listening = () => {
  const { token } = theme.useToken()

  const gClasses = gStyles()

  const dispatch = useAppDispatch()

  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const { listeningType, player } = useAppSelector((state) => state.auth.user.configuration)
  const { list, current, isPlaying, mediaSrc } = useAppSelector((state) => state.media)

  const setIsPlaying = (isPlaying: boolean) => {
    dispatch(mediaAction.play(isPlaying))
  }

  const onAdd = () => {
    if (
      (list.length <= defaultSetting.listening.maxMediaItem && mediaSrc === EMediaSrc.INTERNAL) ||
      mediaSrc === EMediaSrc.EXTERNAL
    )
      dispatch(settingAction.toggleMediaModal())
  }

  const onSrcChange = (e: EMediaSrc) => {
    dispatch(mediaAction.play(false))
    dispatch(actionAsyncMedia.fetchMedias(e)).then(() => {
      dispatch(mediaAction.setMeadiaSrc(e))
    })
  }

  const onCurrentUpdating = (id: number) => {
    dispatch(mediaAction.setCurrentUpdating(id))
    dispatch(mediaAction.setUpdating(true))
    dispatch(settingAction.toggleMediaModal())
  }

  const setTrackIndex = (index: number) => {
    dispatch(mediaAction.setCurrent(index))
  }

  const onDelete = (id: number) => {
    mediaApi.removeMedia(id).then(() => {
      dispatch(mediaAction.remove(id))
    })
  }

  const showExercise = () => {
    if (
      (listeningType === EListeningTypes.Exercise && player && list.length > 0) ||
      (!player && listeningType === EListeningTypes.Exercise)
    ) {
      return (
        <Col xs={24} sm={24} md={24}>
          <Exercise
            player={player}
            transcript={list.length > 0 && current > -1 && player ? list[current].transcript : ''}
            translation={list.length > 0 && current > -1 && player ? list[current].translation : ''}
          />
        </Col>
      )
    }
  }

  const showDictation = () => {
    if (
      (listeningType === EListeningTypes.Dictation && player && list.length > 0) ||
      (!player && listeningType === EListeningTypes.Dictation)
    ) {
      return (
        <Col xs={24} sm={24} md={24}>
          <Dictation
            player={player}
            transcript={list.length > 0 && current > -1 && player ? list[current].transcript : ''}
            translation={list.length > 0 && current > -1 && player ? list[current].translation : ''}
          />
        </Col>
      )
    }
  }

  useEffect(() => {
    dispatch(actionAsyncMedia.fetchMedias(mediaSrc)).then(() => setIsLoaded(true))
  }, [])

  return (
    <div className={gClasses.container}>
      <h2 className={clsx(gClasses.pageTitle)}>Practice listening skill</h2>

      {!isLoaded && <Skeleton />}

      {isLoaded && (
        <div className={clsx(gClasses.contentPage, gClasses.dark)}>
          <Space direction='vertical' style={{ display: 'flex' }}>
            <Row gutter={[token.size, token.size]}>
              {player && (
                <Col xs={24} md={24} lg={24}>
                  <AudioPlayer
                    onAdd={onAdd}
                    tracks={list}
                    current={current}
                    mediaSrc={mediaSrc}
                    isPlaying={isPlaying}
                    setTrackIndex={setTrackIndex}
                    onDelete={onDelete}
                    onCurrentUpdating={onCurrentUpdating}
                    onSrcChange={onSrcChange}
                    setIsPlaying={setIsPlaying}
                  />
                </Col>
              )}
            </Row>

            <Row gutter={[token.size, token.size]}>
              {showExercise()}

              {showDictation()}
            </Row>
          </Space>
        </div>
      )}
    </div>
  )
}

export default Listening

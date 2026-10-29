import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Tags } from '@/views/components'
import appStyle from '@/style/appStyle.module.scss'
import styles from '@/views/features/player/listening.module.scss'
import { tracksApi } from '@/services/firebase'
import { useEffect } from 'react'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { useDispatch, useSelector } from '@/core/hooks'
import { firebaseAuthService } from '@/services/firebase/authService'
import { usePrompt } from '@/helpers/hooks'
import { Col, Row, Space, theme } from 'antd'
import { LiveTranscript, TrackList, TranscriptVocabTabs } from '@/views/features'

export const Listening = () => {
  const { token } = theme.useToken()
  const { message } = usePrompt()
  const dispatch = useDispatch()
  const { currentTrack, tracks } = useSelector((state) => state.listening)

  // Fetch tracks when user is authenticated
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      user ? fetchTracks() : dispatch(listeningAction.setTracks([]))
    })

    return () => unsubscribe()
  }, [])

  const fetchTracks = async () => {
    try {
      const response = await tracksApi.getTracks({
        page: 1,
        size: 100,
        orderBy: 'created_date',
        order: 'DESC',
      })

      if (response.isSuccess && response.content) {
        dispatch(listeningAction.setTracks(response.content))
      } else {
        message({ type: 'error', content: response.message || 'Failed to fetch tracks' })
      }
    } catch (error: any) {
      message({ type: 'error', content: error.message || 'Error fetching tracks' })
    }
  }

  return (
    <>
      <div className={appStyle.container}>
        <PageTitle content={'Listening'} />

        <Space direction={'vertical'} size={token.size} style={{ width: '100%' }}>
          <div style={{ background: token.colorBgContainer }}>
            <Row>
              <Col span={24} md={12} lg={16}>
                <Space
                  direction={'vertical'}
                  size={token.size}
                  className={`${styles.description} ${appStyle.full}`}
                >
                  <h3 style={{ color: token.colorPrimary, margin: 0 }}>
                    {tracks.findIndex((t) => t.id === currentTrack?.id) !== -1
                      ? tracks.find((t) => t.id === currentTrack?.id)?.title
                      : 'No track selected'}
                  </h3>

                  <div
                    className={appStyle.article}
                    dangerouslySetInnerHTML={{
                      __html: currentTrack?.description || 'No description available',
                    }}
                  />

                  {currentTrack?.tags && currentTrack?.tags?.length > 0 && (
                    <Tags label={'Tags'} searchBy={'tags'} tags={currentTrack?.tags} />
                  )}

                  {currentTrack?.relation && currentTrack?.relation?.length > 0 && (
                    <Tags label={'Relation'} tags={currentTrack?.relation} />
                  )}

                  {/* Classification of transcript into words, phrases, collocations by difficulty A1 -> C2 */}
                  <TranscriptVocabTabs
                    track={currentTrack}
                    transcript={currentTrack?.transcript || ''}
                  />
                </Space>
              </Col>

              <Col span={24} md={12} lg={8}>
                <Space
                  direction={'vertical'}
                  size={token.size}
                  className={`${styles.description} ${appStyle.full}`}
                >
                  <TrackList />
                  <LiveTranscript />
                </Space>
              </Col>
            </Row>
          </div>
        </Space>
      </div>
    </>
  )
}

export default Listening

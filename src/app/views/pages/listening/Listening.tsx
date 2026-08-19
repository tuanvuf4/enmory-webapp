import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { LiveTranscript, Player } from '@/views/features'
import { tracksApi } from '@/services/firebase'
import { useEffect } from 'react'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { useDispatch } from '@/core/hooks'
import { firebaseAuthService } from '@/services/firebase/authService'
import { usePrompt } from '@/helpers/hooks'
import { Space, theme } from 'antd'
import appStyle from '@/style/appStyle.module.scss'

export const Listening = () => {
  const { token } = theme.useToken()
  const { message } = usePrompt()
  const dispatch = useDispatch()

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
          <Player />

          <LiveTranscript />
        </Space>
      </div>
    </>
  )
}

export default Listening

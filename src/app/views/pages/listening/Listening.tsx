import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Player } from '@/views/features'
import { tracksApi } from '@/services/firebase'
import { useEffect } from 'react'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { useDispatch } from '@/core/hooks'
import { firebaseAuthService } from '@/services/firebase/authService'
import { usePrompt } from '@/helpers/hooks'

export const Listening = () => {
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

        <Player />
      </div>
    </>
  )
}

export default Listening

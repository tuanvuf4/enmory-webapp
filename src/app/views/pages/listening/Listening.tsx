import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Player } from '@/views/features'
import { tracksApi } from '@/services/firebase'
import { useEffect } from 'react'
import { message } from 'antd'
import { onAuthStateChanged } from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { useDispatch } from '@/core/hooks'

export const Listening = () => {
  const dispatch = useDispatch()

  // Fetch tracks when user is authenticated
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
        message.error(response.message || 'Failed to fetch tracks')
      }
    } catch (error: any) {
      message.error(error.message || 'Error fetching tracks')
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

import { ITracks } from '@/models/media.model'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Player, Toolbar } from '@/views/features'
import { MediaUploadModal } from '@/views/features/modals/mediaUploadModal/MediaUploadModal'
import { tracksApi } from '@/services/firebase'
import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { message } from 'antd'
import { onAuthStateChanged } from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { useDispatch, useSelector } from 'react-redux'
import { settingAction } from '@/store/reducers/setting.reducer'

export const Listening = () => {
  const dispatch = useDispatch()
  const current = useSelector((state: any) => state.setting.trackIndex)

  const [tracks, setTracks] = useState<ITracks[]>([])
  const [open, setOpen] = useState(false)
  const [, setIsFetching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<ITracks | undefined>(undefined)

  // Fetch tracks when user is authenticated
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      user ? fetchTracks() : setTracks([])
    })

    return () => unsubscribe()
  }, [])

  const fetchTracks = async () => {
    try {
      setIsFetching(true)
      const response = await tracksApi.getTracks({
        page: 1,
        size: 100,
        orderBy: 'created_date',
        order: 'DESC',
      })

      if (response.isSuccess && response.content) {
        setTracks(response.content)
      } else {
        message.error(response.message || 'Failed to fetch tracks')
      }
    } catch (error: any) {
      message.error(error.message || 'Error fetching tracks')
    } finally {
      setIsFetching(false)
    }
  }

  const onAdd = () => {
    setSelectedTrack(undefined)
    setOpen(true)
  }

  const onConfirmTrack = (track: ITracks) => {
    if (selectedTrack?.id) {
      // Update existing track
      setTracks(tracks.map((t) => (t.id === selectedTrack.id ? track : t)))
      message.success('Track updated successfully')
    } else {
      // Add new track to the beginning (latest first)
      setTracks([track, ...tracks])
      // Increment current index since new track is added at the beginning
      dispatch(settingAction.setTrackIndex(current + 1))
      message.success('Track added successfully')
    }
    setOpen(false)
    setSelectedTrack(undefined)
  }

  const onDelete = async (trackId: number) => {
    try {
      const response = await tracksApi.removeTrack(String(trackId))

      if (response.isSuccess) {
        const deletedIndex = tracks.findIndex((t) => t.id === trackId)
        const filteredTracks = tracks.filter((t) => t.id !== trackId)

        setTracks(filteredTracks)

        // Adjust current index if needed
        let newIndex = current
        if (deletedIndex === current && filteredTracks.length > 0) {
          // If we deleted the current track, move to the previous one or first one
          newIndex = deletedIndex > 0 ? deletedIndex - 1 : 0
          dispatch(settingAction.setTrackIndex(newIndex))
        } else if (deletedIndex < current) {
          // If we deleted a track before the current one, shift index down by 1
          newIndex = current - 1
          dispatch(settingAction.setTrackIndex(newIndex))
        } else if (filteredTracks.length === 0) {
          // If no tracks left, reset to 0
          newIndex = 0
          dispatch(settingAction.setTrackIndex(0))
        }

        message.success(response.message || 'Track deleted successfully')
      } else {
        message.error(response.message || 'Failed to delete track')
      }
    } catch (error: any) {
      message.error(error.message || 'Error deleting track')
    }
  }

  const onCurrentUpdating = (trackId: number) => {
    const track = tracks.find((t) => t.id === trackId)
    if (track) {
      setSelectedTrack(track)
      setOpen(true)
    }
  }

  const setTrackIndex = (index: number) => {
    dispatch(settingAction.setTrackIndex(index))
  }

  return (
    <>
      <Toolbar pagination={undefined} />

      <div className={appStyle.container}>
        <PageTitle content={'Listening'} />

        <div className={clsx(appStyle.contentPage, appStyle.dark)}>
          <Player
            onAdd={onAdd}
            tracks={tracks}
            current={current}
            setTrackIndex={setTrackIndex}
            onDelete={onDelete}
            onCurrentUpdating={onCurrentUpdating}
            onSelectTrack={setTrackIndex}
          />
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

export default Listening

import { ITracks } from '@/models/media.model'
import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Player, Toolbar } from '@/views/features'
import { MediaUploadModal } from '@/views/features/modals/mediaUploadModal/MediaUploadModal'
import { tracksApi } from '@/services/firebase'
import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { message } from 'antd'

export const Listening = () => {
  const [tracks, setTracks] = useState<ITracks[]>([])
  const [current, setCurrent] = useState(0)
  const [open, setOpen] = useState(false)
  const [, setIsFetching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<ITracks | undefined>(undefined)

  // Fetch tracks on component mount
  useEffect(() => {
    fetchTracks()
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
        console.log('[Listening] Tracks fetched:', response.content)
      } else {
        message.error(response.message || 'Failed to fetch tracks')
      }
    } catch (error: any) {
      console.error('[Listening] Error fetching tracks:', error)
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
      // Add new track
      setTracks([...tracks, track])
      message.success('Track added successfully')
    }
    setOpen(false)
    setSelectedTrack(undefined)
  }

  const onDelete = async (trackId: number) => {
    try {
      const response = await tracksApi.removeTrack(String(trackId))

      if (response.isSuccess) {
        setTracks(tracks.filter((t) => t.id !== trackId))
        message.success(response.message || 'Track deleted successfully')
        console.log('[Listening] Track deleted:', trackId)
      } else {
        message.error(response.message || 'Failed to delete track')
      }
    } catch (error: any) {
      console.error('[Listening] Error deleting track:', error)
      message.error(error.message || 'Error deleting track')
    }
  }

  const onCurrentUpdating = (trackId: number) => {
    const track = tracks.find((t) => t.id === trackId)
    if (track) {
      setSelectedTrack(track)
      setOpen(true)
      console.log('[Listening] Opening edit modal for track:', track)
    }
  }

  const setTrackIndex = (index: number) => {
    setCurrent(index)
    console.log('[Listening] Playing track at index:', index)
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

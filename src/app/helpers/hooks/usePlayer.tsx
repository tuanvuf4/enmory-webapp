import { listeningAction } from '@/store/reducers/listening.reducer'

import { usePrompt } from './usePrompt'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { tracksApi } from '@/services/firebase'
import { settingAction } from '@/store/reducers/setting.reducer'
import { useMediaUploadModal } from './useMediaUploadModal'

export const usePlayer = () => {
  const { message } = usePrompt()
  const { currentTrack, tracks } = useSelector((state) => state.listening)

  const { openMediaUploadModal } = useMediaUploadModal()

  const { confirm } = usePrompt()

  const dispatch = useDispatch()

  const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  const onDeleteTrack = async (trackId: number) => {
    try {
      const response = await tracksApi.removeTrack(String(trackId))

      if (response.isSuccess) {
        const deletedIndex = tracks.findIndex((t) => t.id === trackId)
        const filteredTracks = tracks.filter((t) => t.id !== trackId)

        dispatch(listeningAction.removeTrack(trackId))

        // Adjust trackIndex index if needed
        let newIndex = trackIndex
        if (deletedIndex === trackIndex && filteredTracks.length > 0) {
          // If we deleted the trackIndex track, move to the previous one or first one
          newIndex = deletedIndex > 0 ? deletedIndex - 1 : 0
          dispatch(settingAction.setTrackIndex(newIndex))
        } else if (deletedIndex < trackIndex) {
          // If we deleted a track before the trackIndex one, shift index down by 1
          newIndex = trackIndex - 1
          dispatch(settingAction.setTrackIndex(newIndex))
        } else if (filteredTracks.length === 0) {
          // If no tracks left, reset to 0
          newIndex = 0
          dispatch(settingAction.setTrackIndex(0))
        }

        message({ type: 'success', content: response.message || 'Track deleted successfully' })
      } else {
        message({ type: 'error', content: response.message || 'Failed to delete track' })
      }
    } catch (error: any) {
      message({ type: 'error', content: error.message || 'Error deleting track' })
    }
  }

  const handleDeleteTrack = (trackId: number, trackTitle: string) => {
    confirm({
      title: 'Delete Track',
      content: `Are you sure you want to delete "${trackTitle}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onDeleteTrack(trackId)
      },
    })
  }

  const handleUpdateTrack = (trackId: number) => {
    const track = tracks.find((t) => t.id === trackId)
    if (track) openMediaUploadModal('edit', track)
  }

  const handleCreateTrack = () => {
    openMediaUploadModal('add')
  }

  return {
    handleDeleteTrack,
    handleUpdateTrack,
    handleCreateTrack,
  }
}

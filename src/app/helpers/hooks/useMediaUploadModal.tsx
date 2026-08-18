import { useModal } from '@/context/modal.context'
import { ITracks } from '@/models/media.model'
import { MediaUploadForm } from '@/views/features/modals/mediaUploadModal/MediaUploadForm'

export const useMediaUploadModal = () => {
  const { openModal, closeModal } = useModal()

  const openMediaUploadModal = (
    mode: 'edit' | 'add',
    trackData?: ITracks,
    onConfirm?: (track: ITracks) => void,
  ) => {
    openModal({
      title: mode === 'edit' ? 'Edit Track' : 'Upload',
      width: 1000,
      footer: null,
      maskClosable: false,
      content: (
        <MediaUploadForm
          trackData={trackData}
          onConfirm={(track) => {
            onConfirm?.(track)
            closeModal()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  return { openMediaUploadModal, closeMediaUploadModal: closeModal }
}

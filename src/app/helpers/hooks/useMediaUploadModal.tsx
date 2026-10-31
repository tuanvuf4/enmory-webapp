import { useModal } from '@/context/modal.context'
import { ITracks } from '@/models/media.model'
import { MediaForm } from '@/views/features/modals/mediaUploadModal/MediaForm'
import { SoundOutlined } from '@ant-design/icons'
import { Tag } from 'antd'

export const useMediaUploadModal = () => {
  const { openModal, closeModal } = useModal()

  const openMediaUploadModal = (
    mode: 'edit' | 'add',
    trackData?: ITracks,
    onConfirm?: (track: ITracks) => void,
  ) => {
    openModal({
      title: 'Media Form',
      tag: mode === 'edit' ? <Tag color={'yellow'}>UPDATE</Tag> : <Tag color={'green'}>CREATE</Tag>,
      width: 1000,
      footer: null,
      maskClosable: false,
      allowMinimize: true,
      minimizeInfo: {
        title: trackData?.title ? `Track: ${trackData.title}` : 'Media Upload',
        tooltip: trackData?.title ? `Mở lại bài nghe: ${trackData.title}` : 'Mở lại Media Upload',
        icon: <SoundOutlined />,
      },
      content: (
        <MediaForm
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

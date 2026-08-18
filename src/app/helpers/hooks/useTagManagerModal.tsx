import { useModal } from '@/context/modal.context'
import { TagManagerForm } from '@/views/components'

export const useTagManagerModal = () => {
  const { openModal, closeModal } = useModal()

  const openTagManagerModal = (props?: {
    onTagUpdated?: (previousValue: string, nextValue: string) => void
    onTagDeleted?: (deletedValue: string) => void
  }) => {
    openModal({
      title: 'Tags',
      width: 800,
      footer: null,
      keyboard: false,
      maskClosable: false,
      content: (
        <TagManagerForm
          onClose={closeModal}
          onTagUpdated={props?.onTagUpdated}
          onTagDeleted={props?.onTagDeleted}
        />
      ),
    })
  }

  return { openTagManagerModal, closeTagManagerModal: closeModal }
}

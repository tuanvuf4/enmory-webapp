import { initExampleData } from '@/constant/example'
import { useModal } from '@/context/modal.context'
import { IExample } from '@/models/item.model'
import { ExampleForm } from '@/views/features'

export const useExampleModal = () => {
  const { openModal, closeModal } = useModal()

  const openExampleModal = (mode: 'view' | 'edit' | 'add', data: IExample = initExampleData) => {
    if (mode === 'view') {
      openModal({
        title: null,
        width: 500,
        footer: null,
        closable: false,
        content: <ExampleForm data={data} onCancel={() => closeModal()} />,
      })
    }

    if (mode === 'add') {
      openModal({
        title: 'Add Example',
        width: 500,
        footer: null,
        maskClosable: false,
        content: <ExampleForm data={data} onCancel={() => closeModal()} />,
      })
    }

    if (mode === 'edit') {
      openModal({
        title: 'Edit Example',
        width: 500,
        footer: null,
        maskClosable: false,
        content: <ExampleForm data={data} onCancel={() => closeModal()} />,
      })
    }
  }

  return { openExampleModal, closeExampleModal: closeModal }
}

import { useModal } from '@/context/modal.context'
import { IArticleItem } from '@/models/article.model'
import { ArticleForm } from '@/views/features/modals'

export const useArticleModal = () => {
  const { openModal, closeModal } = useModal()

  const openArticleModal = (mode: 'edit' | 'add', data: IArticleItem | null) => {
    if (mode === 'add') {
      openModal({
        title: 'Add Article',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ArticleForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }

    if (mode === 'edit') {
      openModal({
        title: 'Edit Article',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ArticleForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }
  }

  return { openArticleModal, closeArticleModal: closeModal }
}

import { useModal } from '@/context/modal.context'
import { IArticleCategory } from '@/services/firebase/api/articleCategories.api'
import { ArticleCategoryForm } from '@/views/features/modals'

export const useArticleCategoryModal = () => {
  const { openModal, closeModal } = useModal()

  const openArticleCategoryModal = (mode: 'edit' | 'add', data?: IArticleCategory) => {
    if (mode === 'add') {
      openModal({
        title: 'Add Category',
        width: 600,
        footer: null,
        maskClosable: false,
        content: <ArticleCategoryForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }

    if (mode === 'edit') {
      openModal({
        title: 'Edit Category',
        width: 600,
        footer: null,
        maskClosable: false,
        content: <ArticleCategoryForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }
  }

  return { openArticleCategoryModal, closeArticleCategoryModal: closeModal }
}

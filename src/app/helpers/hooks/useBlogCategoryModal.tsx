import { useModal } from '@/context/modal.context'
import { IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import { BlogCategoryForm } from '@/views/features/modals/blogCategoryModal/blogCategoryForm'

export const useBlogCategoryModal = () => {
  const { openModal, closeModal } = useModal()

  const openBlogCategoryModal = (mode: 'edit' | 'add', data?: IBlogCategory) => {
    if (mode === 'add') {
      openModal({
        title: 'Add Category',
        width: 600,
        footer: null,
        maskClosable: false,
        content: <BlogCategoryForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }

    if (mode === 'edit') {
      openModal({
        title: 'Edit Category',
        width: 600,
        footer: null,
        maskClosable: false,
        content: <BlogCategoryForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }
  }

  return {
    openBlogCategoryModal,
    closeBlogCategoryModal: closeModal,
    openArticleCategoryModal: openBlogCategoryModal,
    closeArticleCategoryModal: closeModal,
  }
}

export const useArticleCategoryModal = useBlogCategoryModal

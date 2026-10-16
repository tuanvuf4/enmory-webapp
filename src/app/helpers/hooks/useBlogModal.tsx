import { useModal } from '@/context/modal.context'
import { IBlogItem } from '@/models/blog.model'
import { BlogForm } from '@/views/features/modals'

export const useBlogModal = () => {
  const { openModal, closeModal } = useModal()

  const openBlogModal = (mode: 'edit' | 'add', data?: IBlogItem) => {
    if (mode === 'add') {
      openModal({
        title: 'Add Blog Post',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <BlogForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }

    if (mode === 'edit') {
      openModal({
        title: 'Edit Blog Post',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <BlogForm data={data} onCancel={closeModal} onClose={closeModal} />,
      })
    }
  }

  return {
    openBlogModal,
    closeBlogModal: closeModal,
    openArticleModal: openBlogModal,
    closeArticleModal: closeModal,
  }
}

export const useArticleModal = useBlogModal

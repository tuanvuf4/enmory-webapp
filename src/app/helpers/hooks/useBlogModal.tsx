import { useModal } from '@/context/modal.context'
import { IBlogItem } from '@/models/blog.model'
import { BlogForm } from '@/views/features/modals'
import { FileTextOutlined } from '@ant-design/icons'
import { Tag } from 'antd'

export const useBlogModal = () => {
  const { openModal, closeModal } = useModal()

  const openBlogModal = (mode: 'edit' | 'add', data?: IBlogItem) => {
    if (mode === 'add') {
      const modalId = data?.id ? `blog-form-${data.id}` : 'blog-form-add'
      openModal({
        id: modalId,
        title: 'Blog Form',
        tag: <Tag color={'green'}>CREATE</Tag>,
        width: 880,
        footer: null,
        maskClosable: false,
        minimizeInfo: {
          title: data?.title ? `Blog: ${data.title}` : 'Blog Form',
          tooltip: data?.title ? `Mở lại bài viết: ${data.title}` : 'Mở lại Blog Form',
          icon: <FileTextOutlined />,
        },
        content: (
          <BlogForm
            data={data}
            onCancel={() => closeModal(modalId)}
            onClose={() => closeModal(modalId)}
          />
        ),
      })
    }

    if (mode === 'edit') {
      const modalId = data?.id ? `blog-form-${data.id}` : 'blog-form-edit'
      openModal({
        id: modalId,
        title: 'Blog Form',
        tag: <Tag color={'yellow'}>UPDATE</Tag>,
        width: 880,
        footer: null,
        maskClosable: false,
        minimizeInfo: {
          title: data?.title ? `Blog: ${data.title}` : 'Blog Form',
          tooltip: data?.title ? `Mở lại bài viết: ${data.title}` : 'Mở lại Blog Form',
          icon: <FileTextOutlined />,
        },
        content: (
          <BlogForm
            data={data}
            onCancel={() => closeModal(modalId)}
            onClose={() => closeModal(modalId)}
          />
        ),
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

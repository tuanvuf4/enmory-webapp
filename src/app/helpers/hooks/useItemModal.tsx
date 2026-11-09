import { useModal } from '@/context/modal.context'
import { useItem } from '@/core/hooks'
import { IItem } from '@/models/item.model'
import { Item } from '@/views/features'
import { initItem, ItemForm } from '@/views/features/modals/itemModal'
import { FormProvider, useForm } from 'react-hook-form'
import { BookOutlined } from '@ant-design/icons'
import { Tag } from 'antd'

interface IViewItemModalContentProps {
  initialData: IItem
  onClose?: () => void
}

const ViewItemModalContent: React.FC<IViewItemModalContentProps> = ({ initialData, onClose }) => {
  const itemId = initialData?.id || ''
  const { data: item } = useItem(itemId, !!itemId)
  const currentItem = item || initialData

  return (
    <Item data={currentItem} active={false} onEditSuccess={onClose} onDeleteSuccess={onClose} />
  )
}

export const useItemModal = () => {
  const { openModal, closeModal } = useModal()

  const ItemFormContext = ({ data, isEditMode }: { data: IItem; isEditMode?: boolean }) => {
    const sortedMeanings = data?.meanings
      ? [...data.meanings].sort((a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0))
      : []

    const methods = useForm<IItem>({
      defaultValues: {
        ...data,
        meanings: sortedMeanings,
        catId: data?.catId || initItem.catId,
      },
    })

    return (
      <FormProvider {...methods}>
        <ItemForm item={{ ...data, meanings: sortedMeanings }} isEditMode={isEditMode} />
      </FormProvider>
    )
  }

  const openItemModal = (
    mode: 'view' | 'edit' | 'add',
    data: IItem = initItem,
    onClose?: () => void,
  ) => {
    if (mode === 'view') {
      const modalId = data?.id ? `item-view-${data.id}` : undefined
      openModal({
        id: modalId,
        title: null,
        width: 800,
        footer: null,
        closable: false,
        content: <ViewItemModalContent initialData={data} onClose={() => closeModal(modalId)} />,
        onClose,
      })
    }

    if (mode === 'add') {
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const originSlug = data?.origin
        ? `-${data.origin.trim().toLowerCase().replace(/\s+/g, '-')}`
        : ''
      const modalId = `item-form-add${originSlug}-${uniqueSuffix}`

      openModal({
        id: modalId,
        title: 'Item Form',
        tag: <Tag color={'green'}>CREATE</Tag>,
        width: 800,
        footer: null,
        maskClosable: false,
        minimizeInfo: {
          title: data?.origin ? `Item: ${data.origin}` : 'Item Form',
          tooltip: data?.origin ? `Mở lại biểu mẫu: ${data.origin}` : 'Mở lại Item Form',
          icon: <BookOutlined />,
        },
        content: <ItemFormContext data={data} isEditMode={false} />,
        onClose,
      })
    }

    if (mode === 'edit') {
      const modalId = data?.id ? `item-form-${data.id}` : 'item-form-edit'

      openModal({
        id: modalId,
        title: 'Item Form',
        tag: <Tag color={'yellow'}>UPDATE</Tag>,
        width: 800,
        footer: null,
        maskClosable: false,
        minimizeInfo: {
          title: data?.origin ? `Item: ${data.origin}` : 'Item Form',
          tooltip: data?.origin ? `Mở lại biểu mẫu: ${data.origin}` : 'Mở lại Item Form',
          icon: <BookOutlined />,
        },
        content: <ItemFormContext data={data} isEditMode={true} />,
        onClose,
      })
    }
  }

  return { openItemModal, closeItemModal: closeModal }
}

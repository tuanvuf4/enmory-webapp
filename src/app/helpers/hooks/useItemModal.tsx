import { useModal } from '@/context/modal.context'
import { useItem } from '@/core/hooks'
import { IItem } from '@/models/item.model'
import { Item } from '@/views/features'
import { initItem, ItemForm } from '@/views/features/modals/itemModal'
import { FormProvider, useForm } from 'react-hook-form'

interface IViewItemModalContentProps {
  initialData: IItem
  onClose?: () => void
}

const ViewItemModalContent: React.FC<IViewItemModalContentProps> = ({ initialData, onClose }) => {
  const itemId = initialData?.id || ''
  const { data: item } = useItem(itemId, !!itemId)
  const currentItem = item || initialData

  return <Item data={currentItem} active={false} onDeleteSuccess={onClose} />
}

export const useItemModal = () => {
  const { openModal, closeModal } = useModal()

  const ItemFormContext = ({ data }: { data: IItem }) => {
    const methods = useForm<IItem>({
      defaultValues: {
        ...data,
        catId: data?.catId || initItem.catId,
      },
    })

    return (
      <FormProvider {...methods}>
        <ItemForm item={data} />
      </FormProvider>
    )
  }

  const openItemModal = (mode: 'view' | 'edit' | 'add', data: IItem = initItem) => {
    if (mode === 'view') {
      openModal({
        title: null,
        width: 800,
        footer: null,
        closable: false,
        content: <ViewItemModalContent initialData={data} onClose={closeModal} />,
      })
    }

    if (mode === 'add') {
      openModal({
        title: 'Add Item',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ItemFormContext data={data} />,
      })
    }

    if (mode === 'edit') {
      openModal({
        title: 'Edit Item',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ItemFormContext data={data} />,
      })
    }
  }

  return { openItemModal, closeItemModal: closeModal }
}

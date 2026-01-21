import { useModal } from '@/context/modal.context'
import { IItem } from '@/models/item.model'
import { Item } from '@/views/features'
import { initItem, ItemForm } from '@/views/features/modals/itemModal'
import { FormProvider, useForm } from 'react-hook-form'

export const useItemForm = () => {
  const { showModal } = useModal()

  const ItemFormContext = ({ data }: { data: IItem }) => {
    const methods = useForm<IItem>({ defaultValues: data })

    return (
      <FormProvider {...methods}>
        <ItemForm />
      </FormProvider>
    )
  }

  const openViewItemForm = (data: IItem) => {
    showModal({
      title: null,
      width: 800,
      footer: null,
      closable: false,
      content: <Item data={data} active={false} />,
    })
  }

  const openItemForm = (mode: 'edit' | 'add' = 'add', data: IItem = initItem) => {
    if (mode === 'add') {
      showModal({
        title: 'Add New Item',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ItemFormContext data={data} />,
      })
    }

    if (mode === 'edit') {
      showModal({
        title: 'Edit New Item',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ItemFormContext data={data} />,
      })
    }
  }

  return { openItemForm, openViewItemForm }
}

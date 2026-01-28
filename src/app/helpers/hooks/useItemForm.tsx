import { useModal } from '@/context/modal.context'
import { IItem } from '@/models/item.model'
import { Item } from '@/views/features'
import { initItem, ItemForm } from '@/views/features/modals/itemModal'
import { FormProvider, useForm } from 'react-hook-form'

export const useItemForm = () => {
  const { openModal } = useModal()

  const ItemFormContext = ({ data, mode }: { data: IItem; mode: 'edit' | 'add' }) => {
    const methods = useForm<IItem>({ defaultValues: data })

    return (
      <FormProvider {...methods}>
        <ItemForm mode={mode} item={data} />
      </FormProvider>
    )
  }

  const openItemForm = (mode: 'view' | 'edit' | 'add' = 'add', data: IItem = initItem) => {
    if (mode === 'view') {
      openModal({
        title: null,
        width: 800,
        footer: null,
        closable: false,
        content: <Item data={data} active={false} />,
      })
    }

    if (mode === 'add') {
      openModal({
        title: 'Add Item',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ItemFormContext data={data} mode={mode} />,
      })
    }

    if (mode === 'edit') {
      openModal({
        title: 'Edit Item',
        width: 800,
        footer: null,
        maskClosable: false,
        content: <ItemFormContext data={data} mode={mode} />,
      })
    }
  }

  return { openItemForm }
}

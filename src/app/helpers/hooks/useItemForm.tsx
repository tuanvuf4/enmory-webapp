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
      title: 'View Item',
      width: 800,
      footer: null,
      content: <Item data={data} />,
    })
  }

  const openItemForm = (mode: 'edit' | 'add' = 'add', data: IItem = initItem) => {
    switch (mode) {
      case 'add':
        showModal({
          title: 'Add New Item',
          width: 800,
          footer: null,
          content: <ItemFormContext data={data} />,
        })
        break

      case 'edit':
        showModal({
          title: 'Edit Item',
          width: 800,
          footer: null,
          content: <ItemFormContext data={data} />,
        })
        break

      default:
        showModal({
          title: 'Add New Item',
          width: 800,
          footer: null,
          content: <ItemFormContext data={data} />,
        })
        break
    }
  }

  return { openItemForm, openViewItemForm }
}

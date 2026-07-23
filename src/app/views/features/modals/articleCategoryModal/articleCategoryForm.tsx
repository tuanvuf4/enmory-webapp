import {
  useCreateArticleCategory,
  useUpdateArticleCategory,
} from '@/core/hooks/useArticleCategories'
import { IArticleCategory } from '@/services/firebase/api/articleCategories.api'
import { theme, message, Input, Button, Flex, ColorPicker, InputNumber, Select } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import type { Color } from 'antd/es/color-picker'
import './articleCategoryForm.module.scss'

interface ArticleCategoryFormProps {
  data?: IArticleCategory
  onCancel?: () => void
  onClose?: () => void
  onSuccess?: () => void
}

export const ArticleCategoryForm: React.FC<ArticleCategoryFormProps> = ({
  data,
  onCancel,
  onClose,
  onSuccess,
}) => {
  const { token } = theme.useToken()

  const { mutate: createCategory, isPending: isCreating } = useCreateArticleCategory()
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateArticleCategory()

  const isEditing = !!data?.id
  const isPending = isCreating || isUpdating

  const categoryTypeOptions = [
    {
      label: 'Posts',
      value: 'posts',
    },
    {
      label: 'Articles',
      value: 'articles',
    },
  ]

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IArticleCategory>({
    defaultValues: {
      name: data?.name || '',
      description: data?.description || '',
      category_type: data?.category_type || 'articles',
      color: data?.color || '',
      order: data?.order || 0,
    },
  })

  const onSubmit = (values: IArticleCategory) => {
    if (isEditing && data?.id) {
      // Update mode
      updateCategory(
        { id: data.id, data: values },
        {
          onSuccess: () => {
            reset()
            onSuccess?.()
            onClose?.()
            message.success('Category updated successfully')
          },
          onError: (error) => {
            message.error('Failed to update category')
            console.error(error)
          },
        },
      )
    } else {
      // Create mode
      createCategory(values, {
        onSuccess: () => {
          reset()
          onSuccess?.()
          onClose?.()
          message.success('Category created successfully')
        },
        onError: (error) => {
          message.error('Failed to create category')
          console.error(error)
        },
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Name Field */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>
          Name <span style={{ color: token.colorError }}>*</span>
        </label>
        <Controller
          control={control}
          name='name'
          rules={{ required: 'Please enter category name' }}
          render={({ field }) => (
            <>
              <Input {...field} placeholder='Category name' status={errors.name ? 'error' : ''} />
              {errors.name && (
                <div style={{ color: token.colorError, fontSize: 12, marginTop: 4 }}>
                  {errors.name.message}
                </div>
              )}
            </>
          )}
        />
      </div>

      {/* Description Field */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>Description</label>
        <Controller
          control={control}
          name='description'
          render={({ field }) => (
            <Input.TextArea
              {...field}
              placeholder='Category description'
              rows={3}
              status={errors.description ? 'error' : ''}
            />
          )}
        />
      </div>

      {/* Type Field */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>Type:</label>

        <Controller
          control={control}
          name='category_type'
          render={({ field }) => (
            <Select
              {...field}
              style={{ width: '100%' }}
              placeholder='Select a category type'
              allowClear
              options={categoryTypeOptions}
            />
          )}
        />
      </div>

      {/* Color Field */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>Color</label>
        <Controller
          control={control}
          name='color'
          render={({ field: { value, onChange } }) => (
            <ColorPicker
              value={value || '#1890ff'}
              onChange={(color: Color) => onChange(color.toHexString())}
            />
          )}
        />
      </div>

      {/* Order Field */}
      <div style={{ marginBottom: token.size * 2 }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>Display Order</label>
        <Controller
          control={control}
          name='order'
          render={({ field }) => <InputNumber {...field} min={0} style={{ width: '100%' }} />}
        />
      </div>

      {/* Buttons */}
      <Flex justify='flex-end' gap={token.size}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type='primary' htmlType='submit' loading={isPending}>
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </Flex>
    </form>
  )
}

import { useCreateBlogCategory, useUpdateBlogCategory } from '@/core/hooks/useBlogCategories'
import { IBlogCategory } from '@/services/firebase/api/blogCategories.api'
import { theme, Input, InputNumber, Button, Flex, ColorPicker } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import type { Color } from 'antd/es/color-picker'
import './blogCategoryForm.module.scss'
import { usePrompt } from '@/helpers/hooks'
import React, { useEffect } from 'react'

export interface BlogCategoryFormProps {
  data?: IBlogCategory
  onCancel?: () => void
  onClose?: () => void
  onSuccess?: () => void
  isInline?: boolean
}

export const BlogCategoryForm: React.FC<BlogCategoryFormProps> = ({
  data,
  onCancel,
  onClose,
  onSuccess,
  isInline = false,
}) => {
  const { message } = usePrompt()
  const { token } = theme.useToken()

  const { mutate: createCategory, isPending: isCreating } = useCreateBlogCategory()
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateBlogCategory()

  const isEditing = !!(data?.id || data?.name)
  const isPending = isCreating || isUpdating

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IBlogCategory>({
    defaultValues: {
      name: data?.name || '',
      color: data?.color || '#1890ff',
      order: data?.order ?? 1,
      value: data?.value ?? '',
    },
  })

  useEffect(() => {
    reset({
      name: data?.name || '',
      color: data?.color || '#1890ff',
      order: data?.order ?? 1,
      value: data?.value ?? '',
    })
  }, [data, reset])

  const onSubmit = (values: IBlogCategory) => {
    const tagName = (values.name || '').trim()
    const tagValue = values.value?.trim()
      ? values.value.trim().toLowerCase().replace(/\s+/g, '_')
      : tagName.toLowerCase().replace(/\s+/g, '_')

    const payload: IBlogCategory = {
      ...values,
      name: tagName,
      color: values.color || '#1890ff',
      order: typeof values.order === 'number' ? values.order : 1,
      value: tagValue,
    }
    const targetId = data?.id || data?.name
    if (isEditing && targetId) {
      // Update mode
      updateCategory(
        { id: targetId, data: payload },
        {
          onSuccess: () => {
            reset()
            onSuccess?.()
            onClose?.()
            message({ type: 'success', content: 'Tag updated successfully' })
          },
          onError: (error) => {
            message({ type: 'error', content: 'Failed to update tag' })
            console.error(error)
          },
        },
      )
    } else {
      // Create mode
      createCategory(payload, {
        onSuccess: () => {
          reset()
          onSuccess?.()
          onClose?.()
          message({ type: 'success', content: 'Tag created successfully' })
        },
        onError: (error) => {
          message({ type: 'error', content: 'Failed to create tag' })
          console.error(error)
        },
      })
    }
  }

  const handleFormSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    handleSubmit(onSubmit)(e)
  }

  const Container = isInline ? 'div' : 'form'

  return (
    <Container
      onSubmit={isInline ? undefined : handleFormSubmit}
      onClick={isInline ? (e: any) => e.stopPropagation() : undefined}
      onKeyDown={
        isInline
          ? (e: any) => {
              if (e.key === 'Enter') {
                if ((e.target as HTMLElement).tagName?.toLowerCase() === 'textarea') {
                  return
                }
                e.preventDefault()
                e.stopPropagation()
                handleFormSubmit()
              }
            }
          : undefined
      }
    >
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

      {/* Order Field */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>Order</label>
        <Controller
          control={control}
          name='order'
          render={({ field }) => (
            <InputNumber
              {...field}
              min={0}
              placeholder='1'
              style={{ width: '100%' }}
              value={field.value ?? 1}
              onChange={(val) => field.onChange(val ?? 1)}
            />
          )}
        />
      </div>

      {/* Color Field */}
      <div style={{ marginBottom: token.size * 2 }}>
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

      {/* Buttons */}
      <Flex justify='flex-end' gap={token.size}>
        <Button htmlType='button' onClick={() => onCancel?.()}>
          Cancel
        </Button>
        <Button
          type='primary'
          htmlType={isInline ? 'button' : 'submit'}
          onClick={isInline ? () => handleFormSubmit() : undefined}
          loading={isPending}
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </Flex>
    </Container>
  )
}

export const ArticleCategoryForm = BlogCategoryForm

import { useCreateBlog, useUpdateBlog, useBlogCategories } from '@/core/hooks'
import { blogKeys } from '@/core/hooks/useBlogs'
import { IBlogItem } from '@/models/blog.model'
import { TextEditor } from '@/views/components'
import { theme, Input, Button, Flex, Select } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import './blogForm.module.scss'
import { usePrompt } from '@/helpers/hooks'

export interface BlogFormProps {
  data?: IBlogItem
  onCancel?: () => void
  onClose?: () => void
  onSuccess?: () => void
}

export const BlogForm: React.FC<BlogFormProps> = ({ data, onCancel, onClose, onSuccess }) => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const queryClient = useQueryClient()

  const { mutate: createBlog, isPending: isCreating } = useCreateBlog()
  const { mutate: updateBlog, isPending: isUpdating } = useUpdateBlog()

  const { data: cats = [] } = useBlogCategories({
    orderBy: 'order',
    order: 'ASC',
  })

  const categories = cats

  const isEditing = !!data?.id
  const isPending = isCreating || isUpdating

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IBlogItem>({
    defaultValues: {
      title: data?.title || '',
      description: data?.description || '',
      category_id: data?.category_id || categories[0]?.id || '',
    },
  })

  const onSubmit = (values: IBlogItem) => {
    if (isEditing && data?.id) {
      // Update mode
      updateBlog(
        { id: data.id, data: values },
        {
          onSuccess: () => {
            reset()
            onSuccess?.()
            onClose?.()
            queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
            if (data.id) {
              queryClient.invalidateQueries({ queryKey: blogKeys.detail(data.id) })
            }
            message({ type: 'success', content: 'Blog updated successfully' })
          },
          onError: (error) => {
            message({ type: 'error', content: 'Failed to update blog' })
            console.error(error)
          },
        },
      )
    } else {
      // Create mode
      createBlog(values, {
        onSuccess: () => {
          reset()
          onSuccess?.()
          onClose?.()
          queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
          message({ type: 'success', content: 'Blog created successfully' })
        },
        onError: (error) => {
          message({ type: 'error', content: 'Failed to create blog' })
          console.error(error)
        },
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Flex style={{ width: '100%' }} gap={token.size} align={'flex-end'} wrap={'wrap'}>
        <div style={{ marginBottom: token.size, flex: 1 }}>
          <label style={{ display: 'block', marginBottom: token.size / 2 }}>
            Title <span style={{ color: token.colorError }}>*</span>
          </label>

          <Controller
            control={control}
            name='title'
            rules={{ required: 'Please enter blog title' }}
            render={({ field }) => (
              <>
                <Input
                  {...field}
                  placeholder='Blog title'
                  status={errors.title ? 'error' : ''}
                />
                {errors.title && (
                  <div style={{ color: token.colorError, fontSize: 12, marginTop: 4 }}>
                    {errors.title.message}
                  </div>
                )}
              </>
            )}
          />
        </div>

        <div style={{ marginBottom: token.size, flex: '0 0 150px' }}>
          <label style={{ display: 'block', marginBottom: token.size / 2 }}>Category</label>

          <Controller
            control={control}
            name='category_id'
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: '100%' }}
                placeholder='Select a category (optional)'
                allowClear
                options={categories.map((cat) => ({
                  label: cat.name,
                  value: cat.id,
                }))}
              />
            )}
          />
        </div>
      </Flex>

      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>
          Description <span style={{ color: token.colorError }}>*</span>
        </label>

        <Controller
          control={control}
          name='description'
          rules={{ required: 'Please enter blog description' }}
          render={({ field: { onChange, value } }) => (
            <>
              <TextEditor content={value} onChange={onChange} />
              {errors.description && (
                <div style={{ color: token.colorError, fontSize: 12, marginTop: 4 }}>
                  {errors.description.message}
                </div>
              )}
            </>
          )}
        />
      </div>

      <Flex justify='flex-end' gap={token.size}>
        <Button onClick={() => onCancel?.()}>Cancel</Button>

        <Button type='primary' variant={'solid'} htmlType='submit' loading={isPending}>
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </Flex>
    </form>
  )
}

export const ArticleForm = BlogForm


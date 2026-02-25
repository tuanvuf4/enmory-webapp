import { useCreateArticle, useUpdateArticle } from '@/core/hooks'
import { articleKeys } from '@/core/hooks/useArticles'
import { IArticleItem } from '@/models/article.model'
import { TextEditor } from '@/views/components'
import { theme, message, Input, Button, Flex } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import './style.module.scss'

interface ArticleFormProps {
  data: IArticleItem | null
  onCancel?: () => void
  onClose?: () => void
  onSuccess?: () => void
}

export const ArticleForm: React.FC<ArticleFormProps> = ({ data, onCancel, onClose, onSuccess }) => {
  const { token } = theme.useToken()
  const queryClient = useQueryClient()

  const { mutate: createArticle, isPending: isCreating } = useCreateArticle()
  const { mutate: updateArticle, isPending: isUpdating } = useUpdateArticle()

  const isEditing = !!data?.id
  const isPending = isCreating || isUpdating

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IArticleItem>({
    defaultValues: {
      title: data?.title || '',
      description: data?.description || '',
    },
  })

  const onSubmit = (values: IArticleItem) => {
    if (isEditing && data?.id) {
      // Update mode
      updateArticle(
        { id: data.id, data: values },
        {
          onSuccess: () => {
            reset()
            onSuccess?.()
            onClose?.()
            queryClient.invalidateQueries({ queryKey: articleKeys.lists() })
            if (data.id) {
              queryClient.invalidateQueries({ queryKey: articleKeys.detail(data.id) })
            }
            message.success('Article updated successfully')
          },
          onError: (error) => {
            message.error('Failed to update article')
            console.error(error)
          },
        },
      )
    } else {
      // Create mode
      createArticle(values, {
        onSuccess: () => {
          reset()
          onSuccess?.()
          onClose?.()
          queryClient.invalidateQueries({ queryKey: articleKeys.lists() })
          message.success('Article created successfully')
        },
        onError: (error) => {
          message.error('Failed to create article')
          console.error(error)
        },
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Title Field */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>
          Title <span style={{ color: token.colorError }}>*</span>
        </label>
        <Controller
          control={control}
          name='title'
          rules={{ required: 'Please enter article title' }}
          render={({ field }) => (
            <>
              <Input {...field} placeholder='Article title' status={errors.title ? 'error' : ''} />
              {errors.title && (
                <div style={{ color: token.colorError, fontSize: 12, marginTop: 4 }}>
                  {errors.title.message}
                </div>
              )}
            </>
          )}
        />
      </div>

      {/* Description Field */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>
          Description <span style={{ color: token.colorError }}>*</span>
        </label>

        <Controller
          control={control}
          name='description'
          rules={{ required: 'Please enter article description' }}
          render={({ field: { onChange, value } }) => (
            <>
              <TextEditor content={value} onChange={(content: any) => onChange(content ?? '')} />
              {/* <TextArea
                {...field}
                placeholder='Article description'
                rows={4}
                status={errors.description ? 'error' : ''}
              /> */}
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
          {isEditing ? 'Save' : 'Create'}
        </Button>
      </Flex>
    </form>
  )
}

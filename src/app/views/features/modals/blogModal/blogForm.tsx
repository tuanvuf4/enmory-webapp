import {
  useCreateBlog,
  useUpdateBlog,
  useBlogCategories,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
  blogCategoryKeys,
} from '@/core/hooks'
import { blogKeys } from '@/core/hooks/useBlogs'
import { IBlogItem } from '@/models/blog.model'
import { TextEditor, InputTag, TagSelect } from '@/views/components'
import { theme, Input, Button, Flex, Row, Col } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import './blogForm.module.scss'
import { usePrompt } from '@/helpers/hooks'
import { useEffect, useMemo } from 'react'

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

  const { mutateAsync: createCategoryMutation } = useCreateBlogCategory()
  const { mutateAsync: updateCategoryMutation } = useUpdateBlogCategory()
  const { mutateAsync: deleteCategoryMutation } = useDeleteBlogCategory()

  const { data: cats = [] } = useBlogCategories()
  const categories = cats

  const isEditing = !!data?.id
  const isPending = isCreating || isUpdating

  const initialTags = useMemo(() => {
    if (data?.tags && Array.isArray(data.tags) && data.tags.length > 0) {
      return data.tags
    }
    if (data?.category_id) {
      return [data.category_id]
    }
    return []
  }, [data])

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<IBlogItem>({
    defaultValues: {
      title: data?.title || '',
      description: data?.description || '',
      relation: data?.relation || [],
      tags: initialTags,
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        title: data.title || '',
        description: data.description || '',
        relation: data.relation || [],
        tags: initialTags,
      })
    }
  }, [data, initialTags, reset])

  const handleTagUpdated = (previousValue: string, nextValue: string) => {
    const currentTags = getValues('tags') || []
    const nextTags = Array.from(
      new Set(currentTags.map((tag) => (tag === previousValue ? nextValue : tag))),
    )
    setValue('tags', nextTags)
  }

  const handleTagDeleted = (deletedValue: string) => {
    const currentTags = getValues('tags') || []
    setValue(
      'tags',
      currentTags.filter((tag) => tag !== deletedValue),
    )
  }

  const onSubmit = (values: IBlogItem) => {
    const dataSubmit: IBlogItem = {
      title: values.title,
      description: values.description,
      relation: values.relation || [],
      tags: values.tags || [],
    }

    if (isEditing && data?.id) {
      // Update mode
      updateBlog(
        { id: data.id, data: dataSubmit },
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
      createBlog(dataSubmit, {
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
      {/* Title */}
      <div style={{ marginBottom: token.size }}>
        <label style={{ display: 'block', marginBottom: token.size / 2 }}>
          Title <span style={{ color: token.colorError }}>*</span>
        </label>

        <Controller
          control={control}
          name='title'
          rules={{ required: 'Please enter blog title' }}
          render={({ field }) => (
            <>
              <Input {...field} placeholder='Blog title' status={errors.title ? 'error' : ''} />
              {errors.title && (
                <div style={{ color: token.colorError, fontSize: 12, marginTop: 4 }}>
                  {errors.title.message}
                </div>
              )}
            </>
          )}
        />
      </div>

      {/* Tags (Blog tags stored in user config) */}
      <Row gutter={[token.size / 2, token.size / 2]} style={{ marginBottom: token.size }}>
        <Col xs={24}>
          <label style={{ display: 'block', marginBottom: token.size / 2 }}>Tags:</label>

          <Controller
            control={control}
            name='tags'
            render={({ field }) => (
              <TagSelect
                mode='multiple'
                style={{ width: '100%' }}
                placeholder='Select tags'
                itemLabel='tag'
                options={categories.map((cat) => ({
                  id: cat.name,
                  label: cat.name,
                  value: cat.name,
                }))}
                value={field.value || []}
                onChange={field.onChange}
                onCreateItem={async (name) => {
                  const res = await createCategoryMutation({
                    name,
                    value: name.trim().toLowerCase().replace(/\s+/g, '_'),
                  })
                  queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() })
                  return res?.name || name
                }}
                onUpdateItem={async (id, newName) => {
                  await updateCategoryMutation({
                    id,
                    data: {
                      name: newName,
                      value: newName.trim().toLowerCase().replace(/\s+/g, '_'),
                    },
                  })
                  queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() })
                  handleTagUpdated(id, newName)
                }}
                onDeleteItem={async (id) => {
                  const res = await deleteCategoryMutation(id)
                  if (res && !res.isSuccess) {
                    throw new Error(res.message || 'Failed to delete tag')
                  }
                  handleTagDeleted(id)
                  queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() })
                }}
                onTagUpdated={handleTagUpdated}
                onTagDeleted={handleTagDeleted}
              />
            )}
          />
        </Col>
      </Row>

      {/* Relation */}
      <Row gutter={[token.size / 2, token.size / 2]} style={{ marginBottom: token.size }}>
        <Col xs={24}>
          <label style={{ display: 'block', marginBottom: token.size / 2 }}>Relation:</label>

          <Controller
            control={control}
            name='relation'
            render={({ field }) => (
              <InputTag
                tags={field.value || []}
                onChange={(value: string[]) => {
                  field.onChange(value)
                }}
              />
            )}
          />
        </Col>
      </Row>

      {/* Description */}
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

import React, { useEffect, useMemo, useState } from 'react'
import {
  useCreateBlog,
  useUpdateBlog,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
  blogCategoryKeys,
  useSelector,
} from '@/core/hooks'
import { blogKeys } from '@/core/hooks/useBlogs'
import { IBlogItem } from '@/models/blog.model'
import { TextEditor, InputTag, TagSelect } from '@/views/components'
import { theme, Input, Button, Row, Col, Tag, Segmented, Space, Typography, Flex } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { usePrompt } from '@/helpers/hooks'
import { useModal } from '@/context/modal.context'
import {
  FileTextOutlined,
  TagsOutlined,
  BranchesOutlined,
  EditOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  ReadOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import clsx from 'clsx'
import moment from 'moment'
import appStyle from '@/style/appStyle.module.scss'
import styles from './blogForm.module.scss'

const { Text } = Typography

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
  const { updateModal } = useModal()

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  const { mutate: createBlog, isPending: isCreating } = useCreateBlog()
  const { mutate: updateBlog, isPending: isUpdating } = useUpdateBlog()

  const { mutateAsync: createCategoryMutation } = useCreateBlogCategory()
  const { mutateAsync: updateCategoryMutation } = useUpdateBlogCategory()
  const { mutateAsync: deleteCategoryMutation } = useDeleteBlogCategory()

  const { user } = useSelector((state) => state.auth)
  const cats = user?.configuration?.blogTags || []

  const isEditing = !!data?.id
  const isPending = isCreating || isUpdating

  useEffect(() => {
    updateModal({
      tag: isEditing ? <Tag color='gold'>CẬP NHẬT</Tag> : <Tag color='green'>TẠO MỚI</Tag>,
    })
  }, [isEditing])

  const initialTags = useMemo(() => {
    if (data?.tags && Array.isArray(data.tags) && data.tags.length > 0) {
      return data.tags
    }
    return []
  }, [data])

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<IBlogItem>({
    defaultValues: {
      title: data?.title || '',
      description: data?.description || '',
      relation: data?.relation || [],
      tags: initialTags,
    },
  })

  const title = watch('title')
  const description = watch('description')
  const tags = watch('tags')
  const relation = watch('relation')

  // Real-time word count & reading time calculation
  const stats = useMemo(() => {
    if (!description) return { words: 0, chars: 0, readingTimeMinutes: 1 }
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = description
    const text = (tempDiv.textContent || tempDiv.innerText || '').trim()
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0
    const chars = text.length
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200))
    return { words, chars, readingTimeMinutes }
  }, [description])

  useEffect(() => {
    if (title?.trim()) {
      updateModal({
        minimizeInfo: {
          title: `Blog: ${title.trim()}`,
          tooltip: `Mở lại bài viết: ${title.trim()}`,
          icon: <FileTextOutlined />,
        },
      })
    }
  }, [title])

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
      title: values.title.trim(),
      description: values.description,
      relation: values.relation || [],
      tags: values.tags || [],
      created_date: data?.created_date,
    }

    if (isEditing && data?.id) {
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
            message({ type: 'success', content: 'Cập nhật bài viết thành công!' })
          },
          onError: (error) => {
            message({ type: 'error', content: 'Không thể cập nhật bài viết' })
            console.error(error)
          },
        },
      )
    } else {
      createBlog(dataSubmit, {
        onSuccess: () => {
          reset()
          onSuccess?.()
          onClose?.()
          queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
          message({ type: 'success', content: 'Tạo bài viết mới thành công!' })
        },
        onError: (error) => {
          message({ type: 'error', content: 'Không thể tạo bài viết mới' })
          console.error(error)
        },
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.blogFormContainer}>
      {/* Top Bar: Stats & View Switcher */}
      <div className={styles.topBar}>
        <Flex align='center' gap={16} wrap='wrap'>
          <div className={styles.statItem}>
            <ReadOutlined style={{ color: token.colorPrimary }} />
            <span>
              <strong>{stats.words.toLocaleString()}</strong> từ
            </span>
          </div>
          <div className={styles.statItem}>
            <ClockCircleOutlined style={{ color: token.colorWarning }} />
            <span>
              ~<strong>{stats.readingTimeMinutes}</strong> phút đọc
            </span>
          </div>
          <div className={styles.statItem}>
            <span style={{ color: token.colorTextTertiary }}>|</span>
            <span style={{ marginLeft: 6 }}>{stats.chars.toLocaleString()} ký tự</span>
          </div>
        </Flex>

        <Segmented
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'editor' | 'preview')}
          options={[
            {
              value: 'editor',
              label: (
                <Space size={6}>
                  <EditOutlined />
                  <span>Soạn thảo</span>
                </Space>
              ),
            },
            {
              value: 'preview',
              label: (
                <Space size={6}>
                  <EyeOutlined />
                  <span>Xem trước</span>
                </Space>
              ),
            },
          ]}
        />
      </div>

      {/* Title Field */}
      <div className={styles.fieldCard}>
        <div className={styles.fieldLabel}>
          <Flex align='center' gap={6}>
            <FileTextOutlined style={{ color: token.colorPrimary }} />
            <span>
              Title <span style={{ color: token.colorError }}>*</span>
            </span>
          </Flex>
        </div>

        <Controller
          control={control}
          name='title'
          rules={{
            required: 'Vui lòng nhập tiêu đề bài viết',
            maxLength: { value: 200, message: 'Tiêu đề không được quá 200 ký tự' },
          }}
          render={({ field }) => (
            <>
              <Input
                {...field}
                size='large'
                placeholder='Nhập tiêu đề bài viết hấp dẫn (VD: 5 phương pháp ghi nhớ từ vựng tiếng Anh...)'
                status={errors.title ? 'error' : ''}
                showCount
                maxLength={200}
                style={{ borderRadius: token.borderRadiusLG }}
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

      {/* Tags and Relations in 2 columns */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div className={styles.fieldCard} style={{ height: '100%' }}>
            <div className={styles.fieldLabel}>
              <Flex align='center' gap={6}>
                <TagsOutlined style={{ color: token.colorSuccess }} />
                <span>Tags</span>
              </Flex>
            </div>

            <Controller
              control={control}
              name='tags'
              render={({ field }) => (
                <TagSelect
                  mode='multiple'
                  style={{ width: '100%' }}
                  placeholder='Chọn hoặc tạo mới thẻ tag...'
                  itemLabel='tag'
                  options={cats.map((cat) => ({
                    id: cat.name,
                    label: cat.name,
                    value: cat.value,
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
                      throw new Error(res.message || 'Không thể xóa thẻ tag')
                    }
                    handleTagDeleted(id)
                    queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() })
                  }}
                  onTagUpdated={handleTagUpdated}
                  onTagDeleted={handleTagDeleted}
                />
              )}
            />
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className={styles.fieldCard} style={{ height: '100%' }}>
            <div className={styles.fieldLabel}>
              <Flex align='center' gap={6}>
                <BranchesOutlined style={{ color: token.colorWarning }} />
                <span>Relation:</span>
              </Flex>
            </div>

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
          </div>
        </Col>
      </Row>

      {/* Editor or Live Preview View */}
      {activeTab === 'editor' ? (
        <div className={styles.fieldCard}>
          <div className={styles.fieldLabel}>
            <Flex align='center' gap={6}>
              <EditOutlined style={{ color: token.colorPrimary }} />
              <span>
                Nội dung bài viết <span style={{ color: token.colorError }}>*</span>
              </span>
            </Flex>
            <Text type='secondary' style={{ fontSize: 12, fontWeight: 400 }}>
              Hỗ trợ Rich Text, bảng biểu, hình ảnh & AI review câu
            </Text>
          </div>

          <Controller
            control={control}
            name='description'
            rules={{ required: 'Vui lòng nhập nội dung bài viết' }}
            render={({ field: { onChange, value } }) => (
              <>
                <div className={styles.editorWrapper}>
                  <TextEditor content={value} onChange={onChange} />
                </div>
                {errors.description && (
                  <div style={{ color: token.colorError, fontSize: 12, marginTop: 6 }}>
                    {errors.description.message}
                  </div>
                )}
              </>
            )}
          />
        </div>
      ) : (
        /* Live Preview Mode */
        <div className={styles.previewWrapper}>
          <div className={styles.previewTitle}>
            {title?.trim() || <span style={{ opacity: 0.5 }}>Chưa có tiêu đề bài viết</span>}
          </div>

          <div className={styles.previewMeta}>
            <Flex align='center' gap={6}>
              <CalendarOutlined style={{ color: token.colorTextTertiary }} />
              <Text type='secondary' style={{ fontSize: 13 }}>
                {moment().format('DD/MM/YYYY HH:mm')}
              </Text>
            </Flex>

            {tags && tags.length > 0 && (
              <Flex align='center' gap={4} wrap='wrap'>
                {tags.map((tag) => (
                  <Tag key={tag} color='blue' style={{ margin: 0 }}>
                    #{tag}
                  </Tag>
                ))}
              </Flex>
            )}

            {relation && relation.length > 0 && (
              <Flex align='center' gap={4} wrap='wrap'>
                {relation.map((rel) => (
                  <Tag key={rel} color='gold' style={{ margin: 0 }}>
                    {rel}
                  </Tag>
                ))}
              </Flex>
            )}
          </div>

          {description ? (
            <div
              className={clsx(appStyle.blog, appStyle.article, styles.previewContent)}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <div className={styles.emptyPreview}>
              <ReadOutlined style={{ fontSize: 36, marginBottom: 8 }} />
              <p>Chưa có nội dung bài viết để xem trước.</p>
              <Button type='link' onClick={() => setActiveTab('editor')}>
                Quay lại soạn thảo ngay
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Actions */}
      <div className={styles.stickyFooter}>
        <Flex align='center' gap={8}>
          {data?.last_update ? (
            <Text type='secondary' style={{ fontSize: 11 }}>
              Last update: {moment(data.last_update).fromNow()}
            </Text>
          ) : (
            <div></div>
          )}
        </Flex>

        <Space size={10}>
          <Button onClick={() => onCancel?.()} disabled={isPending}>
            Cancel
          </Button>

          <Button
            type='primary'
            htmlType='submit'
            loading={isPending}
            icon={<CheckOutlined />}
            style={{ borderRadius: token.borderRadiusLG, minWidth: 110 }}
          >
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </Space>
      </div>
    </form>
  )
}

export const ArticleForm = BlogForm

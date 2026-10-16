import { PlusOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useDispatch, useSelector } from '@/core/hooks'
import { usePrompt, useTagManagerModal } from '@/helpers/hooks'
import { tagApi } from '@/services/firebase'
import { actionAsyncApp } from '@/store/asyncActions'
import { Button, Divider, Flex, Input, Select, theme } from 'antd'
import type { InputRef, SelectProps } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

export interface ITagSelectProps
  extends Omit<SelectProps<string[]>, 'mode' | 'onChange' | 'value'> {
  value?: string[]
  onChange?: (values: string[]) => void
  showManageButton?: boolean
  autoSelectCreated?: boolean
  onTagCreated?: (tag: string) => void
  onTagUpdated?: (previousValue: string, nextValue: string) => void
  onTagDeleted?: (deletedValue: string) => void
}

export const TagSelect: React.FC<ITagSelectProps> = ({
  value = [],
  onChange,
  showManageButton = true,
  autoSelectCreated = true,
  onTagCreated,
  onTagUpdated,
  onTagDeleted,
  showSearch = true,
  placeholder = 'Select tags',
  options: propsOptions,
  filterOption,
  ...restProps
}) => {
  const { token } = theme.useToken()
  const dispatch = useDispatch()
  const { message } = usePrompt()
  const { openTagManagerModal } = useTagManagerModal()

  const { tags: allTags } = useSelector((state) => state.setting)

  const [searchKeyword, setSearchKeyword] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<InputRef>(null)

  useEffect(() => {
    if (!allTags || allTags.length === 0) {
      dispatch(actionAsyncApp.fetchTags() as any)
    }
  }, [allTags, dispatch])

  const defaultTagOptions = useMemo(
    () =>
      (allTags || [])
        .map((tag) => String(tag.value || '').trim())
        .filter(Boolean)
        .map((tag) => ({ label: tag, value: tag })),
    [allTags],
  )

  const mergedOptions = useMemo(() => {
    const baseOptions = propsOptions || defaultTagOptions
    const existingValues = new Set(baseOptions.map((o) => String(o.value)))
    const extraOptions = (value || [])
      .filter((v) => !existingValues.has(v))
      .map((v) => ({ label: v, value: v }))
    return [...baseOptions, ...extraOptions]
  }, [propsOptions, defaultTagOptions, value])

  const trimmedSearch = searchKeyword.trim()

  const hasExactMatch = useMemo(() => {
    if (!trimmedSearch) return false
    const lower = trimmedSearch.toLowerCase()
    return mergedOptions.some((opt) => String(opt.value || '').toLowerCase() === lower)
  }, [trimmedSearch, mergedOptions])

  const filteredOptions = useMemo(() => {
    if (!trimmedSearch) return mergedOptions
    const lower = trimmedSearch.toLowerCase()
    return mergedOptions.filter((opt) =>
      String(opt.label || '')
        .toLowerCase()
        .includes(lower),
    )
  }, [trimmedSearch, mergedOptions])

  const handleCreateTag = async (rawTag: string) => {
    const tagName = rawTag.trim()
    if (!tagName) {
      message({ type: 'warning', content: 'Please enter a tag name' })
      return
    }

    const currentValues = value || []

    // If tag already exists (case-insensitive match)
    const existingOption = mergedOptions.find(
      (opt) => String(opt.value || '').toLowerCase() === tagName.toLowerCase(),
    )

    if (existingOption) {
      const existingValue = String(existingOption.value)
      if (currentValues.includes(existingValue)) {
        message({ type: 'info', content: `Tag "${existingValue}" is already selected` })
      } else {
        const nextValues = [...currentValues, existingValue]
        onChange?.(nextValues)
        message({ type: 'info', content: `Tag "${existingValue}" selected` })
      }
      setNewTagName('')
      setSearchKeyword('')
      return
    }

    try {
      setIsCreating(true)
      const response = await tagApi.createTag(tagName)

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || 'Failed to create tag' })
        return
      }

      message({ type: 'success', content: `Tag "${tagName}" created successfully` })
      await dispatch(actionAsyncApp.fetchTags() as any)

      if (autoSelectCreated) {
        const nextValues = Array.from(new Set([...currentValues, tagName]))
        onChange?.(nextValues)
      }

      onTagCreated?.(tagName)
      setNewTagName('')
      setSearchKeyword('')
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Failed to create tag' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenTagManager = () => {
    openTagManagerModal({
      onTagUpdated: (prev, next) => {
        const current = value || []
        const updated = Array.from(new Set(current.map((t) => (t === prev ? next : t))))
        onChange?.(updated)
        onTagUpdated?.(prev, next)
      },
      onTagDeleted: (deleted) => {
        const current = value || []
        const updated = current.filter((t) => t !== deleted)
        onChange?.(updated)
        onTagDeleted?.(deleted)
      },
    })
  }

  const defaultFilterOption = (input: string, option?: any) =>
    String(option?.label || '')
      .toLowerCase()
      .includes(input.toLowerCase().trim())

  return (
    <Flex align='center' gap={token.size / 2}>
      {showManageButton && (
        <Button
          type='text'
          variant={'filled'}
          icon={<UnorderedListOutlined />}
          onClick={handleOpenTagManager}
          style={{ flex: '1 0 40px' }}
        />
      )}

      <Select
        mode='multiple'
        showSearch={showSearch}
        placeholder={placeholder}
        options={mergedOptions}
        optionFilterProp='label'
        filterOption={filterOption ?? defaultFilterOption}
        value={value}
        searchValue={searchKeyword}
        onSearch={(val) => {
          setSearchKeyword(val)
          restProps.onSearch?.(val)
        }}
        onSelect={(val, option) => {
          if (restProps.autoClearSearchValue !== false) {
            setSearchKeyword('')
          }
          restProps.onSelect?.(val, option)
        }}
        onClear={() => {
          setSearchKeyword('')
          setNewTagName('')
          restProps.onClear?.()
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSearchKeyword('')
            setNewTagName('')
          }
          restProps.onOpenChange?.(open)
        }}
        onInputKeyDown={(e) => {
          if (e.key === 'Enter') {
            const trimmed = searchKeyword.trim()
            if (trimmed && !hasExactMatch && filteredOptions.length === 0) {
              e.preventDefault()
              handleCreateTag(trimmed)
            }
          }
          restProps.onInputKeyDown?.(e)
        }}
        onChange={(values) => onChange?.(values as string[])}
        loading={isCreating || restProps.loading}
        popupRender={(menu) => (
          <div>
            {menu}
            <Divider style={{ margin: '6px 0' }} />
            <div
              style={{ padding: '4px 8px 8px' }}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {trimmedSearch && !hasExactMatch && (
                <Button
                  type='dashed'
                  size='small'
                  icon={<PlusOutlined />}
                  loading={isCreating}
                  style={{
                    width: '100%',
                    marginBottom: 8,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => handleCreateTag(trimmedSearch)}
                >
                  Create tag &quot;{trimmedSearch}&quot;
                </Button>
              )}

              <Flex gap={token.size / 2} align='center'>
                <Input
                  ref={inputRef}
                  value={newTagName}
                  disabled={isCreating}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateTag(newTagName)
                    }
                  }}
                />
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  loading={isCreating}
                  onClick={() => handleCreateTag(newTagName)}
                >
                  Add
                </Button>
              </Flex>
            </div>
          </div>
        )}
        {...restProps}
      />
    </Flex>
  )
}

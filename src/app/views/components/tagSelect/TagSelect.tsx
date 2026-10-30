import {
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useDispatch, useSelector } from '@/core/hooks'
import { usePrompt } from '@/helpers/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { itemKeys } from '@/core/hooks/useItems'
import { tagApi } from '@/services/firebase'
import { actionAsyncApp } from '@/store/asyncActions'
import { Button, Divider, Flex, Input, Select, theme } from 'antd'
import type { InputRef, SelectProps } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

export interface ITagSelectProps extends Omit<SelectProps<any>, 'onChange' | 'value'> {
  mode?: 'multiple' | 'tags' | undefined
  value?: string[] | string
  onChange?: (values: any) => void
  showManageButton?: boolean
  autoSelectCreated?: boolean
  itemLabel?: string
  onCreateItem?: (
    name: string,
  ) => Promise<string | { id?: string; value: string; label?: string } | void>
  onUpdateItem?: (idOrValue: string, nextName: string) => Promise<void>
  onDeleteItem?: (idOrValue: string) => Promise<void>
  onTagCreated?: (tag: string) => void
  onTagUpdated?: (previousValue: string, nextValue: string) => void
  onTagDeleted?: (deletedValue: string) => void
}

export const TagSelect: React.FC<ITagSelectProps> = ({
  mode = 'multiple',
  value,
  onChange,
  showManageButton = false,
  autoSelectCreated = true,
  itemLabel = 'tag',
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onTagCreated,
  onTagUpdated,
  onTagDeleted,
  showSearch = true,
  placeholder,
  options: propsOptions,
  filterOption,
  ...restProps
}) => {
  const { token } = theme.useToken()
  const dispatch = useDispatch()
  const { message, confirm } = usePrompt()
  const queryClient = useQueryClient()

  const { tags: allTags } = useSelector((state) => state.setting)

  const capitalizedItemLabel = itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)
  const isSingle = mode === undefined

  const valueArray = useMemo(() => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value.trim()) return [value.trim()]
    return []
  }, [value])

  const [localCreatedOptions, setLocalCreatedOptions] = useState<
    { label: string; value: string }[]
  >([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isUpdatingTag, setIsUpdatingTag] = useState(false)
  const inputRef = useRef<InputRef>(null)

  useEffect(() => {
    if (!propsOptions && (!allTags || allTags.length === 0)) {
      dispatch(actionAsyncApp.fetchTags() as any)
    }
  }, [allTags, dispatch, propsOptions])

  const defaultTagOptions = useMemo(
    () =>
      (allTags || [])
        .map((tag: any) => {
          const val = String(tag.name || tag.label || tag.value || '').trim()
          return {
            id: tag.id || val,
            label: val,
            value: val,
            color: tag.color,
          }
        })
        .filter((tag) => Boolean(tag.value)),
    [allTags],
  )

  const mergedOptions = useMemo(() => {
    if (propsOptions) {
      const existingKeys = new Set(propsOptions.map((o) => String(o.value)))
      const missingLocals = localCreatedOptions.filter((o) => !existingKeys.has(String(o.value)))
      return [...propsOptions, ...missingLocals]
    }
    const baseOptions = defaultTagOptions
    const existingValues = new Set(baseOptions.map((o) => String(o.value)))
    const extraOptions = valueArray
      .filter((v) => !existingValues.has(v))
      .map((v) => ({ label: v, value: v }))
    return [...baseOptions, ...extraOptions]
  }, [propsOptions, defaultTagOptions, valueArray, localCreatedOptions])

  const trimmedSearch = searchKeyword.trim()

  const hasExactMatch = useMemo(() => {
    if (!trimmedSearch) return false
    const lower = trimmedSearch.toLowerCase()
    return mergedOptions.some(
      (opt) =>
        String(opt.label || '').toLowerCase() === lower ||
        String(opt.value || '').toLowerCase() === lower,
    )
  }, [trimmedSearch, mergedOptions])

  const filteredOptions = useMemo(() => {
    if (!trimmedSearch) return mergedOptions
    const lower = trimmedSearch.toLowerCase()
    return mergedOptions.filter(
      (opt) =>
        String(opt.label || '')
          .toLowerCase()
          .includes(lower) ||
        String(opt.value || '')
          .toLowerCase()
          .includes(lower),
    )
  }, [trimmedSearch, mergedOptions])

  const handleCreateTag = async (rawTag: string) => {
    const itemName = rawTag.trim()
    if (!itemName) {
      message({ type: 'warning', content: `Please enter a ${itemLabel} name` })
      return
    }

    // If item already exists (case-insensitive match by label or value)
    const existingOption = mergedOptions.find(
      (opt) =>
        String(opt.label || '').toLowerCase() === itemName.toLowerCase() ||
        String(opt.value || '').toLowerCase() === itemName.toLowerCase(),
    )

    if (existingOption) {
      const existingValue = String(existingOption.value)
      const existingLabel = String(existingOption.label || existingOption.value)

      if (isSingle) {
        if (value === existingValue) {
          message({
            type: 'info',
            content: `${capitalizedItemLabel} "${existingLabel}" is already selected`,
          })
        } else {
          onChange?.(existingValue)
          message({ type: 'info', content: `${capitalizedItemLabel} "${existingLabel}" selected` })
        }
      } else {
        if (valueArray.includes(existingValue)) {
          message({
            type: 'info',
            content: `${capitalizedItemLabel} "${existingLabel}" is already selected`,
          })
        } else {
          const nextValues = [...valueArray, existingValue]
          onChange?.(nextValues)
          message({ type: 'info', content: `${capitalizedItemLabel} "${existingLabel}" selected` })
        }
      }
      setNewTagName('')
      setSearchKeyword('')
      return
    }

    try {
      setIsCreating(true)

      if (onCreateItem) {
        const result = await onCreateItem(itemName)
        let newKey: string | undefined = undefined
        if (typeof result === 'string') {
          newKey = result
        } else if (result && typeof result === 'object') {
          newKey = (result as any).id || (result as any).value
        }

        if (newKey) {
          setLocalCreatedOptions((prev) => [...prev, { label: itemName, value: newKey as string }])
        }

        message({
          type: 'success',
          content: `${capitalizedItemLabel} "${itemName}" created successfully`,
        })

        if (autoSelectCreated && newKey) {
          if (isSingle) {
            onChange?.(newKey)
          } else {
            onChange?.([...valueArray, newKey])
          }
        }

        onTagCreated?.(itemName)
        setNewTagName('')
        setSearchKeyword('')
        return
      }

      const response = await tagApi.createTag(itemName)

      if (!response.isSuccess) {
        message({ type: 'error', content: response.message || `Failed to create ${itemLabel}` })
        return
      }

      message({
        type: 'success',
        content: `${capitalizedItemLabel} "${itemName}" created successfully`,
      })
      await dispatch(actionAsyncApp.fetchTags() as any)

      if (autoSelectCreated) {
        if (isSingle) {
          onChange?.(itemName)
        } else {
          const nextValues = Array.from(new Set([...valueArray, itemName]))
          onChange?.(nextValues)
        }
      }

      onTagCreated?.(itemName)
      setNewTagName('')
      setSearchKeyword('')
    } catch (error: any) {
      message({ type: 'error', content: error?.message || `Failed to create ${itemLabel}` })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteTag = (itemKey: string, itemText: string) => {
    confirm({
      title: `Delete ${capitalizedItemLabel}`,
      content: `Are you sure you want to delete ${itemLabel} "${itemText}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          if (onDeleteItem) {
            await onDeleteItem(itemKey)
            setLocalCreatedOptions((prev) => prev.filter((opt) => opt.value !== itemKey))

            if (isSingle) {
              if (value === itemKey) {
                onChange?.(undefined)
              }
            } else {
              if (valueArray.includes(itemKey)) {
                const nextValues = valueArray.filter((v) => v !== itemKey)
                onChange?.(nextValues)
              }
            }

            onTagDeleted?.(itemText)
            message({
              type: 'success',
              content: `${capitalizedItemLabel} "${itemText}" deleted successfully`,
            })
            return
          }

          const tagItem = (allTags || []).find(
            (t) =>
              String(t.value || '').trim() === itemKey ||
              String((t as any).label || '').trim() === itemKey,
          )
          const tagId = (tagItem as any)?.id

          let targetTagId = tagId
          if (!targetTagId) {
            const tagsRes = await tagApi.getTags(itemText)
            if (tagsRes.isSuccess && tagsRes.content) {
              const matched = tagsRes.content.find((t) => t.value === itemText)
              targetTagId = matched?.id
            }
          }

          if (targetTagId) {
            const response = await tagApi.deleteTag(targetTagId, itemText)
            if (!response.isSuccess) {
              message({
                type: 'error',
                content: response.message || `Failed to delete ${itemLabel}`,
              })
              return
            }
          }

          if (isSingle) {
            if (value === itemKey || value === itemText) {
              onChange?.(undefined)
            }
          } else {
            if (valueArray.includes(itemKey) || valueArray.includes(itemText)) {
              const nextValues = valueArray.filter((v) => v !== itemKey && v !== itemText)
              onChange?.(nextValues)
            }
          }

          onTagDeleted?.(itemText)
          message({
            type: 'success',
            content: `${capitalizedItemLabel} "${itemText}" deleted successfully`,
          })
          await dispatch(actionAsyncApp.fetchTags() as any)
          queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
        } catch (error: any) {
          message({ type: 'error', content: error?.message || `Failed to delete ${itemLabel}` })
        }
      },
    })
  }

  const handleStartInlineEdit = (itemKey: string, currentLabel: string) => {
    setEditingTag(itemKey)
    setEditingValue(currentLabel)
  }

  const handleCancelInlineEdit = () => {
    setEditingTag(null)
    setEditingValue('')
    setIsUpdatingTag(false)
  }

  const handleSaveInlineEdit = async (itemKey: string, oldItemText: string) => {
    const nextValue = editingValue.trim()
    if (!nextValue) {
      message({ type: 'warning', content: `Please enter a ${itemLabel} name` })
      return
    }

    if (nextValue === oldItemText) {
      handleCancelInlineEdit()
      return
    }

    // Check if new name already exists on another item
    const existing = mergedOptions.find(
      (opt) =>
        String(opt.value) !== itemKey &&
        (String(opt.label || '')
          .trim()
          .toLowerCase() === nextValue.toLowerCase() ||
          String(opt.value || '')
            .trim()
            .toLowerCase() === nextValue.toLowerCase()),
    )
    if (existing) {
      message({ type: 'warning', content: `${capitalizedItemLabel} "${nextValue}" already exists` })
      return
    }

    try {
      setIsUpdatingTag(true)

      if (onUpdateItem) {
        await onUpdateItem(itemKey, nextValue)
        setLocalCreatedOptions((prev) =>
          prev.map((opt) => (opt.value === itemKey ? { ...opt, label: nextValue } : opt)),
        )
        message({ type: 'success', content: `${capitalizedItemLabel} updated successfully` })
        onTagUpdated?.(oldItemText, nextValue)
        handleCancelInlineEdit()
        return
      }

      const tagItem = (allTags || []).find(
        (t) =>
          String(t.value || '').trim() === oldItemText ||
          String((t as any).label || '').trim() === oldItemText,
      )
      let targetTagId = (tagItem as any)?.id

      if (!targetTagId) {
        const tagsRes = await tagApi.getTags(oldItemText)
        if (tagsRes.isSuccess && tagsRes.content) {
          const matched = tagsRes.content.find((t) => t.value === oldItemText)
          targetTagId = matched?.id
        }
      }

      if (targetTagId) {
        const response = await tagApi.updateTag(targetTagId, nextValue)
        if (!response.isSuccess) {
          message({
            type: 'error',
            content: response.message || `Failed to update ${itemLabel}`,
          })
          return
        }
      }

      if (isSingle) {
        if (value === oldItemText) {
          onChange?.(nextValue)
        }
      } else {
        if (valueArray.includes(oldItemText)) {
          const nextValues = valueArray.map((v) => (v === oldItemText ? nextValue : v))
          onChange?.(nextValues)
        }
      }

      onTagUpdated?.(oldItemText, nextValue)
      message({ type: 'success', content: `${capitalizedItemLabel} updated successfully` })
      handleCancelInlineEdit()
      await dispatch(actionAsyncApp.fetchTags() as any)
    } catch (error: any) {
      message({ type: 'error', content: error?.message || `Failed to update ${itemLabel}` })
    } finally {
      setIsUpdatingTag(false)
    }
  }

  const defaultFilterOption = (input: string, option?: any) => {
    const lower = input.toLowerCase().trim()
    return (
      String(option?.label || '')
        .toLowerCase()
        .includes(lower) ||
      String(option?.value || '')
        .toLowerCase()
        .includes(lower)
    )
  }

  const defaultPlaceholder = isSingle ? `Select a ${itemLabel}` : `Select ${itemLabel}s`

  return (
    <Select
      mode={mode}
      showSearch={showSearch}
      placeholder={placeholder || defaultPlaceholder}
      options={mergedOptions}
      optionFilterProp='label'
      optionLabelProp='label'
      filterOption={filterOption ?? defaultFilterOption}
      optionRender={
        restProps.optionRender ??
        ((option) => {
          const itemKey = String(option.value ?? '')
          const itemText = String(option.label ?? option.value ?? '')
          const isEditing = editingTag === itemKey

          if (isEditing) {
            return (
              <Flex
                align='center'
                gap={token.size / 4}
                style={{ width: '100%', padding: '2px 0' }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Input
                  size='small'
                  autoFocus
                  value={editingValue}
                  disabled={isUpdatingTag}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveInlineEdit(itemKey, itemText)
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      handleCancelInlineEdit()
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ flex: 1 }}
                />
                <Button
                  type='text'
                  size='small'
                  icon={<CheckOutlined />}
                  loading={isUpdatingTag}
                  disabled={isUpdatingTag}
                  title='Save'
                  style={{
                    padding: '0 4px',
                    height: 22,
                    minWidth: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: token.colorSuccess,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleSaveInlineEdit(itemKey, itemText)
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                />
                <Button
                  type='text'
                  size='small'
                  icon={<CloseOutlined />}
                  disabled={isUpdatingTag}
                  title='Cancel'
                  style={{ padding: '0 4px', height: 22, minWidth: 22 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleCancelInlineEdit()
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                />
              </Flex>
            )
          }

          return (
            <Flex
              justify='space-between'
              align='center'
              style={{ width: '100%' }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleStartInlineEdit(itemKey, itemText)
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
                title='Double-click to edit'
              >
                {option.label}
              </span>
              <Flex align='center' gap={2}>
                <Button
                  type='text'
                  size='small'
                  icon={<EditOutlined />}
                  title='Edit'
                  style={{
                    padding: '0 4px',
                    height: 22,
                    minWidth: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleStartInlineEdit(itemKey, itemText)
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                />
                <Button
                  type='text'
                  size='small'
                  danger
                  icon={<DeleteOutlined />}
                  title='Delete'
                  style={{
                    padding: '0 4px',
                    height: 22,
                    minWidth: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDeleteTag(itemKey, itemText)
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                />
              </Flex>
            </Flex>
          )
        })
      }
      value={isSingle ? value || undefined : valueArray}
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
          handleCancelInlineEdit()
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
      onChange={(values) => {
        onChange?.(values)
      }}
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
                Create {itemLabel} &quot;{trimmedSearch}&quot;
              </Button>
            )}

            <Flex gap={token.size / 2} align='center'>
              <Input
                ref={inputRef}
                placeholder={`Add new ${itemLabel}...`}
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
      menuItemSelectedIcon={restProps.menuItemSelectedIcon ?? null}
    />
  )
}

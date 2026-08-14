import appStyle from '@/style/appStyle.module.scss'
import {
  FilterOutlined,
  SyncOutlined,
  SearchOutlined,
  Loading3QuartersOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useItemSearchParams, useSelector } from '@/core/hooks'
import { useAutoComplete, useItemModal, useLoading } from '@/helpers/hooks'
import { orderByOptions, orderOptions } from '@/models/app.model'
import { IFormSearchItem } from '@/models/formSearch.model'
import { ECategory } from '@/models/item.model'
import { theme, Button, AutoComplete, Input, Dropdown, Checkbox, Select, Flex } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useLocation } from 'react-router-dom'
import { NotFound, TagManagerModal } from '@/views/components'
import { initSearchFormItem } from '@/constant/index'
import { initItem } from '../modals/itemModal'
import { BaseOptionType } from 'antd/es/select'
import { itemApi } from '@/services/firebase'

interface ISearchFormComp {
  filter?: boolean
  resetForm?: boolean
  submit?: boolean
}

export const SearchItemForm: React.FC<ISearchFormComp> = ({
  filter = true,
  submit = true,
  resetForm = true,
}) => {
  const { token } = theme.useToken()

  const themeMode = useSelector((state) => state.setting.themeMode)

  const isLight = themeMode === 'light'

  const location = useLocation()
  const { showLoading, hideLoading } = useLoading()

  const { urlParams, setUrlParams, navigateWithParams } = useItemSearchParams()

  const { openItemModal } = useItemModal()

  const [showTagModal, setShowTagModal] = useState(false)

  const { categories, tags: allTags } = useSelector((state) => state.setting)

  const tagOptions = useMemo(
    () =>
      (allTags || [])
        .map((tag) => String(tag.value))
        .filter(Boolean)
        .map((tag) => ({ label: tag, value: tag })),
    [allTags],
  )

  const { control, handleSubmit, reset, watch, getValues, setValue } = useForm<IFormSearchItem>({
    defaultValues: urlParams || initSearchFormItem,
  })

  const keyword = watch('keyword')
  const cat = watch('cat')
  const handleOpenTagModal = () => {
    setShowTagModal(true)
  }

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

  const { options, isSearching } = useAutoComplete(
    {
      keyword: keyword || '',
      cat: cat === ECategory.ALL ? 0 : Number(cat),
    },
    'item',
    false,
  )

  const onSelect = async (value: string, option: BaseOptionType) => {
    if (location.pathname.includes('library')) {
      setUrlParams({ ...urlParams, keyword: value }, true)
    } else {
      try {
        showLoading()

        const { isSuccess, content } = await itemApi.getItemById(option.id)
        if (isSuccess && content) {
          openItemModal('view', content)
          hideLoading()
          return
        }
      } catch (error) {
        hideLoading()
      }
    }
  }

  const onSubmit = (data: IFormSearchItem) => {
    location.pathname.includes('library')
      ? setUrlParams(data, true)
      : navigateWithParams(data, 'library')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sync form with URL params on mount and when URL changes
  useEffect(() => reset(urlParams), [urlParams])

  return (
    <div style={{ color: token.colorText }}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: token.size / 2,
        }}
      >
        <Controller
          control={control}
          name={`keyword`}
          render={({ field: { onChange, value } }) => {
            return (
              <div style={{ display: 'flex', flex: '1 0' }}>
                <AutoComplete
                  value={value}
                  placeholder='Enter keyword...'
                  notFoundContent={
                    <NotFound
                      label={<span style={{ color: token.colorText }}>Not found</span>}
                      onClickBtn={() => {
                        openItemModal('add', {
                          ...initItem,
                          origin: getValues('keyword'),
                        })
                      }}
                    />
                  }
                  children={
                    <Input
                      style={{ borderRadius: '999px' }}
                      suffix={isSearching ? <Loading3QuartersOutlined spin /> : undefined}
                    />
                  }
                  style={{
                    flex: '1 0',
                    borderRadius: '999px',
                  }}
                  options={options}
                  onSelect={async (value, option) => await onSelect(value, option)}
                  onClear={() => {
                    onChange('')
                    setUrlParams({ keyword: '' })
                  }}
                  onChange={(text) => onChange(text)}
                />
              </div>
            )
          }}
        />

        {filter && (
          <Dropdown
            trigger={['click']}
            arrow
            popupRender={() => (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: token.size / 2,
                  width: 280,
                  background: isLight
                    ? 'color-mix(in srgb, #ffffff 94%, #edebff 6%)'
                    : 'rgba(10, 12, 44, 0.92)',
                  border: `1px solid ${
                    isLight
                      ? 'color-mix(in srgb, #d7d9ef 80%, transparent)'
                      : 'rgba(120, 100, 255, 0.18)'
                  }`,
                  borderRadius: token.size * 0.75,
                  padding: token.size / 2,
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                  backdropFilter: token.colorBgBase === '#ffffff' ? 'none' : 'blur(20px)',
                  WebkitBackdropFilter: token.colorBgBase === '#ffffff' ? 'none' : 'blur(20px)',
                }}
              >
                <Controller
                  control={control}
                  name={`archive`}
                  render={({ field: { onChange, value } }) => (
                    <Checkbox
                      className={appStyle.fulWidth}
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    >
                      Archive
                    </Checkbox>
                  )}
                />

                <Controller
                  control={control}
                  name={`favorite`}
                  render={({ field: { onChange, value } }) => (
                    <Checkbox
                      className={appStyle.fulWidth}
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    >
                      Favorite
                    </Checkbox>
                  )}
                />

                <Flex align={'center'} gap={token.size / 2}>
                  <p style={{ margin: 0 }}>Tags:</p>
                  <Button
                    size={'small'}
                    icon={<UnorderedListOutlined />}
                    onClick={handleOpenTagModal}
                  />
                </Flex>

                <Controller
                  control={control}
                  name={`tags`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      mode='multiple'
                      allowClear
                      showSearch
                      className={appStyle.fulWidth}
                      value={value || []}
                      placeholder='Select tags'
                      options={tagOptions}
                      optionFilterProp='label'
                      filterOption={(input, option) =>
                        String(option?.label || '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={(values) => onChange(values as string[])}
                    />
                  )}
                />

                <p style={{ margin: 0 }}>Category:</p>

                <Controller
                  control={control}
                  name={`cat`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className={appStyle.fulWidth}
                      value={value}
                      onChange={(e) => onChange(e)}
                      options={categories}
                      defaultValue={ECategory.ALL}
                      placeholder={'Category'}
                    />
                  )}
                />

                <p style={{ margin: 0 }}>Order By:</p>

                <Controller
                  control={control}
                  name={`orderBy`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className={appStyle.fulWidth}
                      value={value}
                      onChange={(e) => onChange(e)}
                      options={orderByOptions}
                      defaultValue={'created_date'}
                    />
                  )}
                />

                <p style={{ margin: 0 }}>Order:</p>

                <Controller
                  control={control}
                  name={`order`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className={appStyle.fulWidth}
                      value={value}
                      onChange={(e) => onChange(e)}
                      options={orderOptions}
                      defaultValue={'DESC'}
                    />
                  )}
                />

                <Button
                  type={'primary'}
                  htmlType='submit'
                  className={appStyle.fulWidth}
                  onClick={() => handleSubmit(onSubmit)()}
                >
                  Apply
                </Button>
              </div>
            )}
          >
            <Button
              type='default'
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FilterOutlined />
            </Button>
          </Dropdown>
        )}

        {resetForm && (
          <Button
            type='default'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setUrlParams(initSearchFormItem)}
          >
            <SyncOutlined />
          </Button>
        )}

        {submit && (
          <Button
            type='primary'
            htmlType='submit'
            onClick={() => handleSubmit(onSubmit)()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SearchOutlined />
            <span className={appStyle.fromTablet}>Search</span>
          </Button>
        )}
      </form>

      <TagManagerModal
        title='Tags'
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        onTagUpdated={handleTagUpdated}
        onTagDeleted={handleTagDeleted}
      />
    </div>
  )
}

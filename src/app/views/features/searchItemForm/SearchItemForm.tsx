import globalStyle from '@/style/appStyle'
import {
  CloseCircleOutlined,
  FilterOutlined,
  SyncOutlined,
  SearchOutlined,
  Loading3QuartersOutlined,
} from '@ant-design/icons'
import { useItemSearchParams, useSelector } from '@/core/hooks'
import { useAutoComplete, useItemModal, useLoading } from '@/helpers/hooks'
import { orderByOptions, orderOptions } from '@/models/app.model'
import { IFormSearchItem } from '@/models/formSearch.model'
import { ECategory } from '@/models/item.model'
import { theme, Button, AutoComplete, Input, Dropdown, Checkbox, Select } from 'antd'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useLocation } from 'react-router-dom'
import styles from './style'
import clsx from 'clsx'
import { NotFound } from '@/views/components'
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
  const classes = styles()
  const globalClasses = globalStyle()

  const location = useLocation()
  const { showLoading, hideLoading } = useLoading()

  const { urlParams, setUrlParams, navigateWithParams } = useItemSearchParams()

  const { openItemModal } = useItemModal()

  const { categories } = useSelector((state) => state.setting)

  const { control, handleSubmit, reset, watch, getValues } = useForm<IFormSearchItem>({
    defaultValues: urlParams || initSearchFormItem,
  })

  const keyword = watch('keyword')
  const cat = watch('cat')

  const { options, isSearching } = useAutoComplete(keyword, 'item', false, {
    cat: cat === ECategory.ALL ? 0 : Number(cat),
  })

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
    <div className={classes.searchForm}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <Controller
          control={control}
          name={`keyword`}
          render={({ field: { onChange, value } }) => {
            return (
              <div className={classes.autoSearchInputGroup}>
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
                      className={classes.searchExampleInput}
                      suffix={isSearching ? <Loading3QuartersOutlined spin /> : undefined}
                      allowClear={
                        isSearching
                          ? false
                          : {
                              clearIcon: (
                                <CloseCircleOutlined
                                  style={{
                                    background: token.colorWhite,
                                    padding: token.size / 4,
                                    borderRadius: '50%',
                                    color: token.colorBgLayout,
                                    fontSize: 14,
                                  }}
                                />
                              ),
                            }
                      }
                    />
                  }
                  className={clsx(classes.autoSearchInput, globalClasses.fulWidth)}
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
            popupRender={() => (
              <div className={classes.filterWrapper}>
                <Controller
                  control={control}
                  name={`archive`}
                  render={({ field: { onChange, value } }) => (
                    <Checkbox
                      className={globalClasses.fulWidth}
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
                      className={globalClasses.fulWidth}
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    >
                      Favorite
                    </Checkbox>
                  )}
                />

                <p style={{ margin: 0 }}>Category:</p>

                <Controller
                  control={control}
                  name={`cat`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className={globalClasses.fulWidth}
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
                      className={globalClasses.fulWidth}
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
                      className={globalClasses.fulWidth}
                      value={value}
                      onChange={(e) => onChange(e)}
                      options={orderOptions}
                      defaultValue={'DESC'}
                    />
                  )}
                />

                <hr style={{ margin: `${token.size / 4}px 0px` }} />

                <Button
                  type={'primary'}
                  htmlType='submit'
                  className={globalClasses.fulWidth}
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
            <span className={globalClasses.fromTablet}>Search</span>
          </Button>
        )}
      </form>
    </div>
  )
}

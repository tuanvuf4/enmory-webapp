import globalStyle from '@/style/appStyle'
import {
  CloseCircleOutlined,
  FilterOutlined,
  SyncOutlined,
  SearchOutlined,
  Loading3QuartersOutlined,
} from '@ant-design/icons'
import { useSelector } from '@/core/hooks'
import { useAutoComplete } from '@/helpers/hooks'
import { AppOrderByQuery, orderByOptions, AppOrderQuery, orderOptions } from '@/models/app.model'
import { IFormSearchItem } from '@/models/formSearch.model'
import { EType, ECategory } from '@/models/item.model'
import { initSearchFormItem } from '@/services/index'
import { theme, Button, AutoComplete, Input, Dropdown, Checkbox, Select } from 'antd'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import styles from './style'
import clsx from 'clsx'
import { NoResult } from '@/views/components'

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

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const { categories } = useSelector((state) => state.setting)

  // Read form values from URL params
  const formSearchValue: IFormSearchItem = {
    keyword: searchParams.get('keyword') || '',
    cat: searchParams.get('cat') ? Number(searchParams.get('cat')) : ECategory.ALL,
    archive: searchParams.get('archive') === 'true',
    order: (searchParams.get('order') as AppOrderQuery) || 'DESC',
    orderBy: (searchParams.get('orderBy') as AppOrderByQuery) || 'created_date',
  }

  const { control, handleSubmit, reset, watch } = useForm<IFormSearchItem>({
    defaultValues: formSearchValue,
  })

  const keyword = watch('keyword')
  const cat = watch('cat')

  const { options, isSearching } = useAutoComplete(keyword, 'item', false, {
    cat: cat !== ECategory.ALL ? cat : undefined,
  })

  const updateUrlParams = (data: Partial<IFormSearchItem>, resetPage: boolean = true) => {
    const params = new URLSearchParams(searchParams)

    // Reset page to 0 when filters change (unless explicitly disabled)
    if (resetPage) {
      params.set('page', '0')
    }

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })
    setSearchParams(params)
  }

  const onSelect = (value: string) => {
    reset({ ...initSearchFormItem, keyword: value })

    // Update URL params
    updateUrlParams({
      keyword: value,
      archive: false,
    })
  }

  const onSubmit = (data: IFormSearchItem) => {
    // Update URL params instead of Redux (reset page to 0)

    if (location.pathname.includes('library')) {
      updateUrlParams(data, true)
    } else {
      // Build URL params with page reset to 0
      const urlData = { ...data, page: 0 }
      navigate(
        '/library?' +
          new URLSearchParams(
            Object.entries(urlData).reduce(
              (acc, [key, value]) => {
                if (
                  value !== undefined &&
                  value !== '' &&
                  value !== ECategory.ALL &&
                  value !== EType.ALL
                ) {
                  acc[key] = String(value)
                }
                return acc
              },
              {} as Record<string, string>,
            ),
          ).toString(),
      )
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sync form with URL params on mount and when URL changes
  useEffect(() => {
    reset(formSearchValue)
  }, [searchParams])

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
                    <NoResult
                    // onAdd={() => {
                    //   dispatch(
                    //     settingAction.setCurrentItem({
                    //       ...initItem,
                    //       origin: getValues('keyword'),
                    //     }),
                    //   )
                    // }}
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
                  onSelect={onSelect}
                  onClear={() => {
                    updateUrlParams({ keyword: '' })
                    onChange('')
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
            dropdownRender={() => (
              <div className={classes.filterWrapper}>
                <Controller
                  control={control}
                  name={`archive`}
                  render={({ field: { onChange, value } }) => (
                    <Checkbox
                      className={globalClasses.fulWidth}
                      checked={value}
                      onChange={(e) => {
                        onChange(e.target.checked)
                        updateUrlParams({
                          archive: e.target.checked,
                        })
                      }}
                    >
                      Archive
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
                      onChange={(e) => {
                        onChange(e)
                        updateUrlParams({ cat: e })
                      }}
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
                      onChange={(e) => {
                        onChange(e)
                        updateUrlParams({ orderBy: e as AppOrderByQuery })
                      }}
                      options={[
                        {
                          label: 'Level',
                          value: 'level',
                        },
                        ...orderByOptions,
                      ]}
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
                      onChange={(e) => {
                        onChange(e)
                        updateUrlParams({ order: e as AppOrderQuery })
                      }}
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
            onClick={() => {
              const resetValues = {
                keyword: '',
                cat: ECategory.ALL,
                type: EType.ALL,
                archive: false,
                order: 'DESC' as AppOrderQuery,
                orderBy: 'created_date' as AppOrderByQuery,
              }
              reset(resetValues)
              setSearchParams({})
            }}
          >
            <SyncOutlined />
            <span className={globalClasses.fromTablet}>Reset</span>
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

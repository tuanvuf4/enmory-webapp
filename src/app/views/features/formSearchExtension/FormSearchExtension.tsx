import appStyle from '@/style/appStyle.module.scss'
import {
  CloseCircleOutlined,
  FilterOutlined,
  SyncOutlined,
  SearchOutlined,
  Loading3QuartersOutlined,
} from '@ant-design/icons'
import { useAutoComplete } from '@/helpers/hooks'
import { AppOrderByQuery, orderByOptions, AppOrderQuery, orderOptions } from '@/models/app.model'
import { IFormSearchEx } from '@/models/formSearch.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { initSearchFormEx } from '@/services/index'
import { theme, AutoComplete, Input, Dropdown, Select, Button } from 'antd'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import styles from './style.module.scss'
import clsx from 'clsx'
import { NotFound } from '@/views/components'

interface IProps {
  filter?: boolean
}

export const FormSearchEx: React.FC<IProps> = ({ filter = true }) => {
  const { token } = theme.useToken()

  const [searchParams, setSearchParams] = useSearchParams()

  // Read form values from URL params
  const formSearchQuery: IFormSearchEx = {
    keyword: searchParams.get('keyword') || '',
    order: (searchParams.get('order') as AppOrderQuery) || 'DESC',
    orderBy: (searchParams.get('orderBy') as AppOrderByQuery) || 'created_date',
  }

  const { control, handleSubmit, reset, watch } = useForm<IFormSearchEx>({
    defaultValues: formSearchQuery,
  })

  const updateUrlParams = (data: Partial<IFormSearchEx>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })
    setSearchParams(params)
  }

  const keyword = watch('keyword')

  const { options, isSearching } = useAutoComplete(
    {
      keyword: keyword || '',
    },
    'example',
  )

  const onSelect = (value: string) => {
    exampleApi.getExampleById(value).then(() => {
      reset({ ...initSearchFormEx, keyword: '' })

      // Update URL params
      updateUrlParams({
        keyword: '',
        order: 'DESC',
        orderBy: 'created_date',
      })
    })
  }

  const onSubmit = (data: IFormSearchEx) => {
    // Update URL params instead of Redux
    updateUrlParams(data)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sync form with URL params on mount and when URL changes
  useEffect(() => {
    reset(formSearchQuery)
  }, [searchParams])

  return (
    <div className={styles.searchForm}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <Controller
          control={control}
          name={`keyword`}
          render={({ field: { onChange, value } }) => {
            return (
              <div className={styles.autoSearchInputGroup}>
                <AutoComplete
                  value={value}
                  placeholder='Enter keyword...'
                  notFoundContent={<NotFound showButton={false} />}
                  children={
                    <Input
                      className={styles.searchExampleInput}
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
                  className={clsx(styles.autoSearchInput, appStyle.fulWidth)}
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
            popupRender={() => (
              <div className={styles.filterWrapper}>
                <p style={{ margin: 0 }}>Order By:</p>

                <Controller
                  control={control}
                  name={`orderBy`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className={appStyle.fulWidth}
                      value={value}
                      onChange={(e) => {
                        onChange(e)
                        updateUrlParams({ orderBy: e as AppOrderByQuery })
                      }}
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
              order: 'DESC' as AppOrderQuery,
              orderBy: 'created_date' as AppOrderByQuery,
            }
            reset(resetValues)
            setSearchParams({})
          }}
        >
          <SyncOutlined />
          <span className={appStyle.fromTablet}>Reset</span>
        </Button>

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
      </form>
    </div>
  )
}

import globalStyle from '@/style/appStyle'
import {
  PlusOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  SyncOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { useAppSelector, useAppDispatch } from '@/core/hooks'
import { useAutoComplete } from '@/helpers/hooks'
import { transformItemModelToClient } from '@/helpers/item'
import {
  ELoading,
  AppOrderByQuery,
  orderByOptions,
  AppOrderQuery,
  orderOptions,
} from '@/models/app.model'
import { IFormSearchItem } from '@/models/formSearch.model'
import { EType, ECategory } from '@/models/item.model'
import { itemApi } from '@/services/api'
import { initSearchFormItem, allSelect } from '@/services/index'
import { itemAsync } from '@/store/async/item.async'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { theme, Button, AutoComplete, Input, Dropdown, Checkbox, Select } from 'antd'
import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { initItem } from '../modals/itemModal'
import styles from './style'
import clsx from 'clsx'

interface ISearchFormComp {
  filter?: boolean
  resetForm?: boolean
  submit?: boolean
}

export const FormSearchItem: React.FC<ISearchFormComp> = ({
  filter = true,
  submit = true,
  resetForm = true,
}) => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const navigate = useNavigate()
  const location = useLocation()

  const [showtype, setShowType] = useState<boolean>(false)

  const { formSearchValue } = useAppSelector((state) => state.items)
  const { categories, types } = useAppSelector((state) => state.config)

  const dispatch = useAppDispatch()

  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm<IFormSearchItem>({
    defaultValues: initSearchFormItem,
  })

  const keyword = watch('keyword')

  const { options } = useAutoComplete(keyword)

  const NoResult = () => {
    return (
      <div className={classes.optionItem} onClick={(e) => e.stopPropagation()}>
        <span>No exact!</span>

        <Button
          className={clsx(classes.btnAddNew)}
          icon={
            <PlusOutlined style={{ fontSize: token.fontSizeHeading4 }} color={token.colorPrimary} />
          }
          onClick={() => {
            dispatch(
              settingAction.setCurrentItem({
                ...initItem,
                original: getValues('keyword'),
              }),
            )
            dispatch(settingAction.toggleItemModal())
          }}
        >
          Add
        </Button>
      </div>
    )
  }

  const noResultInList = (options: any[], value: string) => {
    const noResult = [{ value: 'noresult', label: NoResult() }]

    if (options.length > 0 && options.findIndex((item) => item.label === value) === -1) {
      return [...options, ...noResult]
    }

    if (options.length > 0 && options.findIndex((item) => item.label === value) > -1) {
      return [...options]
    }

    if (options.length === 0 && value) {
      return noResult
    }

    return []
  }

  const onSelect = (value: string) => {
    reset({ ...initSearchFormItem, keyword: value })
    dispatch(
      itemAction.updatePagination({
        page: defaultSetting.pagination.page,
        size: defaultSetting.pagination.size,
      }),
    )
    dispatch(
      itemAction.updateSearchFormValue({
        keyword: value,
        archive: false,
        defect: false,
      }),
    )

    if (location.pathname.includes('library')) {
      dispatch(
        itemAsync.fetchItems({
          keyword: value,
          exact: true,
          archive: false,
          defect: false,
          page: defaultSetting.pagination.page,
          size: defaultSetting.pagination.size,
        }),
      )
    } else {
      const params = {
        keyword: value,
        page: 0,
        size: defaultSetting.numberItemOfAutoComplete * 2,
        exact: true,
      }
      itemApi
        .getItemAutoComplete(params, { headers: { loading: ELoading.YES } })
        .then((response) => {
          dispatch(settingAction.toggleViewItemModal())
          dispatch(
            settingAction.setCurrentItem({
              ...transformItemModelToClient(response.content.data[0]),
            }),
          )
        })
    }
  }

  const onSubmit = (data: IFormSearchItem) => {
    dispatch(
      itemAction.updatePagination({
        page: defaultSetting.pagination.page,
        size: defaultSetting.pagination.size,
      }),
    )
    dispatch(itemAction.updateSearchFormValue({ ...data }))
    if (location.pathname.includes('library')) {
      dispatch(
        itemAsync.fetchItems({
          ...data,
          page: defaultSetting.pagination.page,
          size: defaultSetting.pagination.size,
        }),
      ).then(() => {
        // console.log(`resp: `, resp)
      })
    } else {
      navigate('/library')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // useEffect(() => {
  //   dispatch(
  //     itemAsync.fetchItems({
  //       keyword: formSearchValue.keyword || '',
  //       cat: ECategory.ALL,
  //       type: EType.ALL,
  //       defect: false,
  //       archive: false,
  //       page: pagination.page,
  //       size: pagination.size,
  //     }),
  //   )
  // }, [])

  useEffect(() => {
    reset(formSearchValue)
  }, [])

  useEffect(() => {
    reset(formSearchValue)
  }, [formSearchValue])

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
                  placeholder='Keyword'
                  children={
                    <Input
                      className={classes.searchExampleInput}
                      allowClear={{
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
                      }}
                    />
                  }
                  className={clsx(classes.autoSearchInput, gClasses.fulWidth)}
                  options={noResultInList(options, value)}
                  onSelect={onSelect}
                  onClear={() => {
                    dispatch(itemAction.updateSearchFormValue({ keyword: '' }))
                    onChange('')
                  }}
                  onChange={(text) => {
                    onChange(text)
                  }}
                />

                {/* <Button
                  className={classNames(classes.btnAddNew)}
                  icon={
                    <PlusOutlined
                      style={{ fontSize: token.fontSizeHeading4 }}
                      color={token.colorPrimary}
                    />
                  }
                  onClick={() => {
                    dispatch(
                      settingAction.setCurrentItem({
                        ...initItem,
                        original: getValues('keyword'),
                      }),
                    )
                    dispatch(settingAction.toggleItemModal())
                  }}
                >
                  Add
                </Button> */}
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
                      className={gClasses.fulWidth}
                      checked={value}
                      onChange={(e) => {
                        onChange(e.target.checked)
                        dispatch(
                          itemAction.updateSearchFormValue({
                            archive: e.target.checked,
                          }),
                        )
                      }}
                    >
                      Archive
                    </Checkbox>
                  )}
                />

                <Controller
                  control={control}
                  name={`defect`}
                  render={({ field: { onChange, value } }) => (
                    <Checkbox
                      className={gClasses.fulWidth}
                      checked={value}
                      onChange={(e) => {
                        onChange(e.target.checked)
                        dispatch(
                          itemAction.updateSearchFormValue({
                            defect: e.target.checked,
                            type: EType.ALL,
                          }),
                        )
                      }}
                    >
                      Missing
                    </Checkbox>
                  )}
                />

                <p style={{ margin: 0 }}>Category:</p>

                <Controller
                  control={control}
                  name={`cat`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className={gClasses.fulWidth}
                      value={value}
                      onChange={(e) => {
                        onChange(e)
                        if (e === ECategory.WORD) {
                          setValue('type', EType.ALL)
                          setShowType(true)
                          dispatch(itemAction.updateSearchFormValue({ cat: e }))
                        } else {
                          setShowType(false)
                          dispatch(
                            itemAction.updateSearchFormValue({
                              cat: e,
                              type: EType.ALL,
                            }),
                          )
                        }
                      }}
                      options={[allSelect, ...categories]}
                      defaultValue={ECategory.ALL}
                      placeholder={'Category'}
                    />
                  )}
                />

                {showtype && !getValues('defect') && (
                  <Controller
                    control={control}
                    name={`type`}
                    render={({ field: { onChange, value } }) => (
                      <Select
                        className={gClasses.fulWidth}
                        value={value}
                        onChange={(e) => {
                          onChange(e)
                          dispatch(itemAction.updateSearchFormValue({ type: e }))
                        }}
                        options={[allSelect, ...types]}
                        defaultValue={EType.ALL}
                      />
                    )}
                  />
                )}

                <p style={{ margin: 0 }}>Order By:</p>

                <Controller
                  control={control}
                  name={`orderBy`}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className={gClasses.fulWidth}
                      value={value}
                      onChange={(e) => {
                        onChange(e)
                        dispatch(
                          itemAction.updateSearchFormValue({ orderBy: e as AppOrderByQuery }),
                        )
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
                      className={gClasses.fulWidth}
                      value={value}
                      onChange={(e) => {
                        onChange(e)
                        dispatch(itemAction.updateSearchFormValue({ order: e as AppOrderQuery }))
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
                  className={gClasses.fulWidth}
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
              dispatch(itemAction.resetQuery())
              reset({
                keyword: '',
                cat: 0,
                type: 0,
                archive: false,
                defect: false,
              })
            }}
          >
            <SyncOutlined />
            <span className={gClasses.fromTablet}>Reset</span>
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
            <span className={gClasses.fromTablet}>Search</span>
          </Button>
        )}
      </form>
    </div>
  )
}

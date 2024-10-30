import globalStyle from "@/style/appStyle"
import { CloseCircleOutlined, FilterOutlined, SyncOutlined, SearchOutlined } from "@ant-design/icons"
import { defaultSetting } from "@/config/appConfig"
import { useAppSelector, useAppDispatch } from "@/core/hooks"
import { useAutoComplete } from "@/helpers/hooks"
import { AppOrderByQuery, orderByOptions, AppOrderQuery, orderOptions } from "@/models/app.model"
import { IFormSearchEx } from "@/models/formSearch.model"
import { exampleApi } from "@/services/api"
import { initSearchFormEx } from "@/services/index"
import { exampleAsync } from "@/store/async/example.async"
import { exampleAction } from "@/store/reducers/example.reducer"
import { theme, AutoComplete, Input, Dropdown, Select, Button } from "antd"
import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import styles from "./style"
import clsx from "clsx"


interface IProps {
  filter?: boolean
}

export const FormSearchEx: React.FC<IProps> = ({ filter = true }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const { pagination, formSearchQuery } = useAppSelector((state) => state.example)

  const dispatch = useAppDispatch()

  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm<IFormSearchEx>({
    defaultValues: initSearchFormEx,
  })

  const keyword = watch('keyword')

  const { options } = useAutoComplete(keyword, 'example')

  const NoResult = () => {
    return (
      <div className={classes.optionItem} onClick={(e) => e.stopPropagation()}>
        <span>No result!</span>
      </div>
    )
  }

  const noResultInList = (options: any[], value: string) => {
    const noResult = [{ value: 'noresult', label: NoResult() }]

    if (options.length === 0 && value) {
      return noResult
    }

    if (options.length > 0 && options.findIndex((item) => item.label === value) > -1) {
      return [...options]
    }

    if (options.length > 0 && options.findIndex((item) => item.label === value) === -1) {
      return [...options, ...noResult]
    }

    return []
  }

  const onSelect = (value: string) => {
    exampleApi.getExampleById(value).then((resp) => {
      reset({ ...initSearchFormEx, keyword: '' })
      dispatch(exampleAction.setExample([resp.content]))
      dispatch(
        exampleAction.updatePagination({
          page: 0,
          total: 1,
          totalPage: 1,
          size: 20,
        }),
      )
      dispatch(
        exampleAction.updateSearchFormValue({
          keyword: '',
          order: 'DESC',
          orderBy: 'created_date',
        }),
      )
    })
  }

  const onSubmit = (data: IFormSearchEx) => {
    dispatch(exampleAction.updateSearchFormValue({ ...data }))
    dispatch(
      exampleAsync.fetchExamples({
        ...data,
        page: defaultSetting.pagination.page,
        size: defaultSetting.pagination.size,
      }),
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // useEffect(() => {
  //   dispatch(
  //     exampleAsync.fetchExamples({
  //       keyword: formSearchQuery.keyword || '',
  //       page: pagination.page,
  //       size: pagination.size,
  //       order: 'DESC',
  //       orderBy: 'created_date',
  //     }),
  //   )
  // }, [])

  useEffect(() => {
    reset(formSearchQuery)
  }, [])

  useEffect(() => {
    reset(formSearchQuery)
  }, [formSearchQuery])

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
                    dispatch(exampleAction.updateSearchFormValue({ keyword: '' }))
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
                          exampleAction.updateSearchFormValue({ orderBy: e as AppOrderByQuery }),
                        )
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
                      className={gClasses.fulWidth}
                      value={value}
                      onChange={(e) => {
                        onChange(e)
                        dispatch(exampleAction.updateSearchFormValue({ order: e as AppOrderQuery }))
                      }}
                      options={orderOptions}
                      defaultValue={'DESC'}
                    />
                  )}
                />

                <hr style={{ margin: `${token.size / 4}px 0px` }} />

                <Button
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

        <Button
          type='default'
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            dispatch(exampleAction.resetQuery())
            reset({
              keyword: '',
            })
          }}
        >
          <SyncOutlined />
          <span className={gClasses.fromTablet}>Reset</span>
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
          <span className={gClasses.fromTablet}>Search</span>
        </Button>
      </form>
    </div>
  )
}

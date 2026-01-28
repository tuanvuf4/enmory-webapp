import globalStyle from '@/style/appStyle'
import { SyncOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { exampleApi } from '@/services/firebase/api/example.api'
import { theme, Button, AutoComplete, Input } from 'antd'
import { PropsWithChildren, useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import exStyles from '@/views/features/item/style'
import clsx from 'clsx'
import { NoResult } from '@/views/components'
import { ExampleItem } from '../exampleItem'
import { Loading } from '../loading'
import { useDispatch, useSelector } from '@/core/hooks'
import { exampleAction } from '@/store/reducers/example.reducer'

interface IProps {
  title?: string
}

interface IExampleForm {
  query: string
}

export const ExampleOverView: React.FC<PropsWithChildren & IProps> = () => {
  const { token } = theme.useToken()
  const classes = styles()
  const exClasses = exStyles()
  const globalClasses = globalStyle()

  const dispatch = useDispatch()

  const { list: examples } = useSelector((state) => state.example)

  const { openNotification } = usePrompt()

  const [loading, setLoading] = useState<boolean>(false)

  const { control, setValue, handleSubmit, watch } = useForm<IExampleForm>({
    defaultValues: {
      query: '',
    },
  })

  const keyword = watch('query')

  const { options } = useAutoComplete(keyword, 'example')

  console.log(`*** options *** `, options)

  const onSelect = (option: any) => {
    exampleApi.getExampleById(option.id).then(({ content }) => {
      setValue('query', '')
      if (content) {
        dispatch(exampleAction.update([content]))
      }
    })
  }

  const getRandomExamples = useCallback(async () => {
    try {
      setLoading(true)
      const { isSuccess, content } = await exampleApi.getRandomExamples({
        page: 0,
        size: 10,
      })
      if (isSuccess) {
        dispatch(exampleAction.update(content || []))
      }
    } catch (error) {
      console.error('Error fetching random examples:', error)
      openNotification({ type: 'error', message: 'Failed to fetch examples' })
    } finally {
      setLoading(false)
    }
  }, [dispatch, openNotification])

  const onEdit = async (id: number | string) => {
    try {
      await exampleApi.getExampleById(id)
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = async (id: number | string) => {
    try {
      await exampleApi.getExampleById(id)
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onSubmit = async (data: IExampleForm) => {
    const { isSuccess, content } = await exampleApi.getExamples({
      keyword: data.query,
      page: 1,
      size: 10,
    })
    console.log(`*** content *** `, content)
    if (isSuccess && content) {
      dispatch(exampleAction.update(content || []))
    }
  }

  const onClear = () => {
    setValue('query', '')
  }

  useEffect(() => {
    if (examples.length === 0) {
      getRandomExamples()
    }
  }, [examples])

  return (
    <div className={classes.exampleOverview}>
      <form
        className={classes.overviewForm}
        onSubmit={handleSubmit(onSubmit)}
        style={{ width: '100%' }}
      >
        <Controller
          control={control}
          name={`query`}
          render={({ field: { onChange, value } }) => {
            return (
              <AutoComplete
                value={value}
                placeholder='Keyword'
                className={classes.autoSearchInput}
                notFoundContent={<NoResult showAddBtn={false} />}
                children={
                  <Input
                    className={classes.searchExampleInput}
                    onClear={() => onClear()}
                    allowClear={{
                      clearIcon: (
                        <CloseCircleOutlined
                          style={{
                            background: token.colorWhite,
                            padding: token.size / 8,
                            borderRadius: '50%',
                            color: token.colorBgLayout,
                            fontSize: 14,
                          }}
                        />
                      ),
                    }}
                  />
                }
                options={options}
                onSelect={(_, o) => onSelect(o)}
                onChange={(text) => onChange(text)}
              />
            )
          }}
        />

        <Button
          type='text'
          variant={'text'}
          style={{ color: token.colorWhite }}
          onClick={getRandomExamples}
        >
          <SyncOutlined />
        </Button>

        <Button type={'primary'} htmlType='submit' style={{ color: token.colorWhite }}>
          <SearchOutlined />
          <span className={globalClasses.fromTablet}>Search</span>
        </Button>
      </form>

      {loading && <Loading active={loading} inner={true} />}

      {!loading && examples?.length > 0 && (
        <div className={clsx(exClasses.examples)}>
          <ul>
            {examples.map((example, key) => {
              return (
                <li key={key} className={clsx(exClasses.exampleItem)} style={{ paddingLeft: 8 }}>
                  <ExampleItem
                    data={example}
                    onEdit={() => onEdit(example.id || -1)}
                    onDelete={() => onDelete(example.id || -1)}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

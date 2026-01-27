import globalStyle from '@/style/appStyle'
import {
  SyncOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  CaretLeftOutlined,
  CaretRightOutlined,
} from '@ant-design/icons'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { theme, Button, AutoComplete, Input, Row } from 'antd'
import { PropsWithChildren, useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import exStyles from '@/views/features/item/style'
import clsx from 'clsx'
import { NoResult } from '@/views/components'
import { ExampleItem } from '../exampleItem'
import { Loading } from '../loading'

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

  const { openNotification } = usePrompt()

  const [keyword, setKeyword] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [examples, setExamples] = useState<IExample[]>([])
  const [currentPage, setCurrentPage] = useState<number>(0)

  const { options } = useAutoComplete(keyword, 'example')

  const { control, setValue, handleSubmit } = useForm<IExampleForm>({
    defaultValues: {
      query: '',
    },
  })

  const onSelect = (option: any) => {
    exampleApi.getExampleById(option.id).then(({ content }) => {
      setValue('query', '')
      if (content) {
      }
    })
  }

  const getRandomExamples = async () => {
    setIsLoaded(false)
    const nextPage = currentPage + 1
    try {
      const response = await exampleApi.getRandomExamples({
        page: nextPage,
        size: 10,
      })
      setExamples(response.content || [])
      setCurrentPage(nextPage)
    } catch (error) {
      console.error('Error fetching random examples:', error)
      openNotification({ type: 'error', message: 'Failed to fetch examples' })
      setExamples([])
    } finally {
      setIsLoaded(true)
    }
  }

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
    console.log(`data: `, data)
    const { isSuccess, content } = await exampleApi.getExamples({
      keyword: data.query,
      page: 0,
      size: 10,
    })
    console.log(`*** content *** `, content)
    if (isSuccess && content) setExamples(content || [])
  }

  const onClear = () => {
    setKeyword('')
    setExamples([])
    setValue('query', '')
  }

  useEffect(() => {
    getRandomExamples()
  }, [])

  return (
    <div className={classes.exampleOverview}>
      <form
        className={classes.overviewForm}
        onSubmit={handleSubmit(onSubmit)}
        style={{ width: '100%' }}
      >
        <Button
          type='default'
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: token.colorWhite,
          }}
          onClick={getRandomExamples}
        >
          <SyncOutlined />
          <span className={globalClasses.fromTablet}>Refresh</span>
        </Button>

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
                onClear={() => onChange('')}
                onChange={(text) => {
                  onChange(text)
                  setKeyword(text)
                }}
              />
            )
          }}
        />

        <Row>
          <Button type={'text'} variant={'outlined'} style={{ color: token.colorWhite }}>
            <CaretLeftOutlined />
          </Button>

          <Button type={'text'} variant={'outlined'} style={{ color: token.colorWhite }}>
            <CaretRightOutlined />
          </Button>
        </Row>

        <Button type={'primary'} htmlType='submit' style={{ color: token.colorWhite }}>
          <SearchOutlined />
          <span className={globalClasses.fromTablet}>Search</span>
        </Button>
      </form>

      {examples?.length > 0 && (
        <div className={clsx(exClasses.examples)}>
          {!isLoaded && <Loading />}
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
